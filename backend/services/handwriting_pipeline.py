import base64
import time
from typing import Optional, Tuple

import cv2
import numpy as np
from scipy.ndimage import uniform_filter1d
from scipy.signal import find_peaks

from .feature_meta import feature_rows


class PipelineError(ValueError):
    pass


def _png_data_uri(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise PipelineError("Failed to encode image stage")
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode("ascii")


def _downsample_profile(values: np.ndarray, max_points: int = 360):
    n = len(values)
    if n <= max_points:
        return [{"x": int(i), "v": float(values[i])} for i in range(n)]
    idx = np.array_split(np.arange(n), max_points)
    chunks = np.array_split(values.astype(float), max_points)
    return [{"x": int(np.mean(ix)), "v": float(np.mean(c))} for ix, c in zip(idx, chunks)]


def _stroke_histogram(dist: np.ndarray, n_bins: int = 32):
    d = dist[dist > 0]
    if d.size == 0:
        return []
    hist, edges = np.histogram(d, bins=n_bins)
    return [{"bin": f"{edges[i]:.2f}", "count": int(hist[i])} for i in range(n_bins) if hist[i] > 0]


def _detect_word_gaps(fg: np.ndarray):
    """Paper Eq. 5–6: vertical projection V(x); runs of low-foreground columns between
    ink regions are candidate word spaces."""
    V = fg.sum(axis=0)
    ink = V > 0
    gap_widths = []
    if ink.any():
        first = int(np.argmax(ink))
        last = int(len(ink) - 1 - np.argmax(ink[::-1]))
        run = 0
        for x in range(first, last + 1):
            if not ink[x]:
                run += 1
            elif run > 0:
                gap_widths.append(run)
                run = 0
    return gap_widths, V


def _detect_line_bands(fg: np.ndarray):
    """Paper Eq. 7–8: horizontal projection P(y) + SciPy peak detection identifies
    handwriting-line regions; a linear fit of line-position centroids yields the
    preliminary baseline-related angle."""
    h, w = fg.shape
    P = fg.sum(axis=1).astype(float)
    if P.max() <= 0:
        return 0, [], P
    smooth = uniform_filter1d(P, size=max(3, (w // 150) * 2 + 1))
    peaks, _ = find_peaks(smooth, prominence=0.20 * float(smooth.max()),
                          distance=max(10, int(h * 0.04)))
    row_thr = 0.12 * float(smooth.max())
    bands = []
    for p in peaks:
        top, bottom = int(p), int(p)
        while top - 1 >= 0 and smooth[top - 1] >= row_thr:
            top -= 1
        while bottom + 1 < h and smooth[bottom + 1] >= row_thr:
            bottom += 1
        bands.append({"top": top, "bottom": bottom, "peak": int(p)})
    return len(bands), bands, P


def analyze_handwriting(image_bytes: bytes,
                        min_component_area: Optional[int] = None) -> Tuple[dict, np.ndarray]:
    """Full pipeline: grayscale -> Otsu -> morphological ruling-line handling ->
    connected-component filtering -> 8-feature extraction. Returns (payload, processed_binary)."""
    t0 = time.perf_counter()
    arr = np.frombuffer(image_bytes, np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise PipelineError("Could not decode image. Please upload a valid PNG/JPG file.")
    h, w = bgr.shape[:2]

    # 1. Grayscale conversion (paper III-B)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    # 2. Otsu thresholding — inverted so ink becomes the white foreground
    otsu_threshold, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    binary = binary.astype(np.uint8)

    # 3–4. Morphological opening with a long horizontal kernel detects ruled lines;
    #       detected lines are removed (may clip strokes that overlap them, as the paper notes)
    kernel_len = max(int(w * 0.15), 25)
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_len, 1))
    line_mask = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
    ruling_pixels = int(np.count_nonzero(line_mask))
    processed = cv2.bitwise_and(binary, cv2.bitwise_not(line_mask)) if ruling_pixels > 0 else binary

    # 5. Connected-component noise filtering (small foreground components removed)
    if min_component_area is None:
        min_component_area = max(5, int(0.00003 * h * w))
    n_components, labels, stats, _ = cv2.connectedComponentsWithStats(processed, connectivity=8)
    cleaned = np.zeros_like(processed)
    removed_components = 0
    for i in range(1, n_components):
        if stats[i, cv2.CC_STAT_AREA] >= min_component_area:
            cleaned[labels == i] = 255
        else:
            removed_components += 1

    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    fg = cleaned > 0
    n_fg = int(fg.sum())
    total = fg.size
    warnings = []
    if n_fg == 0:
        warnings.append("No handwriting foreground was detected after preprocessing — features default to zero/null.")

    # ---- Eight quantitative features (paper Eq. 1–9) ----
    ink_density = n_fg / total                                     # Eq. 1
    if n_fg > 0:
        ys, xs = np.where(fg)
        writing_height = int(ys.max() - ys.min())                  # Eq. 2
        writing_width = int(xs.max() - xs.min())                   # Eq. 3
    else:
        writing_height = writing_width = 0

    dist_t = cv2.distanceTransform(cleaned, cv2.DIST_L2, 5)
    d_vals = dist_t[dist_t > 0]
    d_mean = float(d_vals.mean()) if d_vals.size else 0.0
    stroke_width = 2.0 * d_mean                                    # Eq. 4

    gap_widths, V = _detect_word_gaps(fg)
    word_spaces = len(gap_widths)                                  # Ng
    average_gap = float(np.mean(gap_widths)) if gap_widths else 0.0  # Eq. 6

    n_lines, line_bands, P = _detect_line_bands(fg)                # Eq. 8 -> L
    baseline_angle = None                                          # Eq. 7 -> θ
    if n_lines >= 2 and n_fg > 0:
        pts = []
        for band in line_bands:
            sub = fg[band["top"]:band["bottom"] + 1]
            if sub.any():
                yy, xx = np.where(sub)
                pts.append((float(xx.mean()), float(band["top"] + yy.mean())))
        if len(pts) >= 2:
            px = np.array([p[0] for p in pts])
            py = np.array([p[1] for p in pts])
            if float(px.std()) > 1e-6:
                slope = float(np.polyfit(px, py, 1)[0])
                baseline_angle = float(np.degrees(np.arctan(slope)))

    features = {
        "ink_density": round(ink_density, 6),
        "writing_height": writing_height,
        "writing_width": writing_width,
        "stroke_width": round(stroke_width, 4),
        "word_spaces": word_spaces,
        "average_gap": round(average_gap, 4),
        "baseline_angle": round(baseline_angle, 4) if baseline_angle is not None else None,
        "handwriting_lines": n_lines,
    }

    payload = {
        "filename": "",
        "width": w,
        "height": h,
        "processing_time_ms": round(elapsed_ms, 2),
        "warnings": warnings,
        "preprocessing": {
            "otsu_threshold": round(float(otsu_threshold), 2),
            "horizontal_kernel_length": kernel_len,
            "ruling_line_pixels_removed": ruling_pixels,
            "min_component_area": int(min_component_area),
            "components_total": int(n_components - 1),
            "components_removed": int(removed_components),
        },
        "stages": {
            "original": _png_data_uri(bgr),
            "grayscale": _png_data_uri(gray),
            "binary": _png_data_uri(binary),
            "processed": _png_data_uri(cleaned),
        },
        "features": features,
        "feature_rows": feature_rows(features),
        "charts": {
            "vertical_projection": _downsample_profile(V),
            "horizontal_projection": _downsample_profile(P),
            "gap_widths": [int(g) for g in gap_widths],
            "line_bands": line_bands,
            "stroke_distance_histogram": _stroke_histogram(dist_t),
        },
    }
    return payload, cleaned
