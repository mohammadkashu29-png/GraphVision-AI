"""Projection-based line segmentation for handwritten text.

Uses horizontal ink-density projection with Gaussian smoothing and valley
detection to segment multi-line handwriting images. Crops are taken from
the **original RGB image** so that TrOCR receives clean, undamaged input.

Key improvements over the previous connected-component approach:
  - Deskew estimation via projection-variance maximisation.
  - Horizontal ruling-line removal only on the binary used for projection
    (the original image is never modified).
  - Gaussian-smoothed projection with valley-based line boundary detection.
  - Proper padding and edge-artifact filtering.
"""

from __future__ import annotations

import cv2
import numpy as np
from PIL import Image
from typing import List, Tuple
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_gray(image: Image.Image) -> np.ndarray:
    """PIL RGB → OpenCV grayscale uint8."""
    return cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2GRAY)


def _binarise(gray: np.ndarray) -> np.ndarray:
    """Otsu binarisation with ink = 255 (inverted)."""
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    return binary.astype(np.uint8)


def _remove_ruling_lines(binary: np.ndarray) -> np.ndarray:
    """Remove long horizontal ruling lines from a binary image.

    Only for projection computation — never applied to the RGB image.
    """
    h, w = binary.shape
    kernel_len = max(int(w * 0.25), 40)
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_len, 1))
    line_mask = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
    if np.count_nonzero(line_mask) > 0:
        return cv2.bitwise_and(binary, cv2.bitwise_not(line_mask))
    return binary


def _clear_border(binary: np.ndarray, margin: int = 4) -> np.ndarray:
    """Zero out thin border strips that often contain scanning artefacts."""
    out = binary.copy()
    out[:margin, :] = 0
    out[-margin:, :] = 0
    out[:, :margin] = 0
    out[:, -margin:] = 0
    return out


def _estimate_skew(binary: np.ndarray, angle_range: int = 15) -> float:
    """Estimate document skew by maximising horizontal-projection variance."""
    h, w = binary.shape
    best_var, best_angle = 0.0, 0.0
    for angle in np.arange(-angle_range, angle_range + 1, 1):
        M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        rotated = cv2.warpAffine(binary, M, (w, h), flags=cv2.INTER_NEAREST)
        proj = np.sum(rotated > 0, axis=1).astype(float)
        v = np.var(proj)
        if v > best_var:
            best_var = v
            best_angle = float(angle)
    return best_angle


def _horizontal_projection(binary: np.ndarray) -> np.ndarray:
    """Sum of foreground pixels per row."""
    return np.sum(binary > 0, axis=1).astype(float)


def _find_line_boundaries(
    proj: np.ndarray,
    img_height: int,
    min_line_height: int = 15,
) -> List[Tuple[int, int]]:
    """Detect line boundaries from a smoothed horizontal projection.

    Returns list of (top, bottom) row ranges, one per text line.
    """
    # Adaptive sigma: about 3-5% of image height
    sigma = max(2.0, img_height * 0.02)
    smooth = gaussian_filter1d(proj, sigma=sigma)

    if smooth.max() < 1:
        return []

    # Find peaks in the smoothed projection
    min_distance = max(15, int(img_height * 0.06))
    prominence = max(5.0, smooth.max() * 0.08)
    peaks, properties = find_peaks(smooth, distance=min_distance, prominence=prominence)

    if len(peaks) == 0:
        # Fallback: treat entire image as one line
        ink_rows = np.where(proj > 0)[0]
        if len(ink_rows) > 0:
            return [(int(ink_rows[0]), int(ink_rows[-1]))]
        return []

    # For each peak, expand outward to find line boundaries
    threshold = max(1.0, smooth.max() * 0.03)
    boundaries = []
    for peak in peaks:
        # Expand upward
        top = int(peak)
        while top > 0 and smooth[top - 1] > threshold:
            top -= 1
        # Expand downward
        bottom = int(peak)
        while bottom < len(smooth) - 1 and smooth[bottom + 1] > threshold:
            bottom += 1
        # Only keep lines with reasonable height
        if bottom - top + 1 >= min_line_height:
            boundaries.append((top, bottom))

    # Merge overlapping boundaries
    if not boundaries:
        return []

    merged = [list(boundaries[0])]
    for top, bottom in boundaries[1:]:
        last = merged[-1]
        if top <= last[1] + 3:  # slight overlap or adjacency → merge
            last[1] = max(last[1], bottom)
        else:
            merged.append([top, bottom])

    return [(t, b) for t, b in merged]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def segment_lines(image: Image.Image) -> List[Image.Image]:
    """Segment a handwriting image into individual line crops.

    Pipeline:
      1. Grayscale → Otsu binarisation (ink = white).
      2. Clear border artefacts.
      3. Remove horizontal ruling lines (binary only — for projection).
      4. Estimate and correct skew.
      5. Build horizontal projection on the cleaned, deskewed binary.
      6. Detect line boundaries via peak + valley analysis.
      7. Crop from the **original RGB image** (optionally deskewed) with padding.

    Returns a list of PIL RGB images, one per detected line, top-to-bottom.
    """
    gray = _to_gray(image)
    binary = _binarise(gray)
    h, w = binary.shape

    # Clear border noise
    binary_clean = _clear_border(binary, margin=min(4, h // 20))

    # Remove ruling lines for projection only
    binary_for_proj = _remove_ruling_lines(binary_clean)

    # Estimate skew
    skew_angle = _estimate_skew(binary_for_proj, angle_range=12)

    # Deskew the binary for projection
    if abs(skew_angle) > 0.5:
        M = cv2.getRotationMatrix2D((w / 2, h / 2), skew_angle, 1.0)
        binary_deskewed = cv2.warpAffine(binary_for_proj, M, (w, h), flags=cv2.INTER_NEAREST)
        # Also deskew the original RGB for cropping
        orig_rgb = np.array(image.convert("RGB"))
        rgb_deskewed = cv2.warpAffine(orig_rgb, M, (w, h),
                                       borderMode=cv2.BORDER_CONSTANT,
                                       borderValue=(255, 255, 255))
    else:
        binary_deskewed = binary_for_proj
        rgb_deskewed = np.array(image.convert("RGB"))

    # Horizontal projection
    proj = _horizontal_projection(binary_deskewed)

    # Find line boundaries
    boundaries = _find_line_boundaries(proj, h)

    if not boundaries:
        # Fallback: return entire image
        return [image.convert("RGB")]

    # Crop with padding
    padding = max(5, int(h * 0.02))
    line_images: List[Image.Image] = []
    for top, bottom in boundaries:
        t = max(0, top - padding)
        b = min(h - 1, bottom + padding)
        crop = rgb_deskewed[t:b + 1, 0:w]
        # Skip very thin crops (likely artefacts)
        if crop.shape[0] < 10:
            continue
        line_images.append(Image.fromarray(crop))

    if not line_images:
        return [image.convert("RGB")]

    return line_images
