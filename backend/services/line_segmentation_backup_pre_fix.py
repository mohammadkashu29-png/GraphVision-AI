# Backup of original line_segmentation implementation (pre‑fix)

from __future__ import annotations

import cv2
import numpy as np
from PIL import Image
from typing import List

# Reuse the band detection helper from the pipeline to keep behaviour consistent
from .handwriting_pipeline import _detect_line_bands


def _to_numpy(img: Image.Image) -> np.ndarray:
    """Convert a PIL Image (RGB) to a NumPy grayscale array (uint8)."""
    arr = np.array(img.convert("RGB"))
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    return gray


def _preprocess_binary(gray: np.ndarray) -> np.ndarray:
    """Return a binary (ink=255) image with ruled lines removed.

    Mirrors the steps used in `handwriting_pipeline.analyze_handwriting`:
    1. Otsu (invert) – ink becomes white
    2. Horizontal morphological opening to detect ruling lines.
    3. Remove the mask only if it looks like notebook ruling (thin and spans most of width).
    """
    # 1. Otsu (invert)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    binary = binary.astype(np.uint8)
    # 2. Detect horizontal ruling lines
    h, w = binary.shape
    kernel_len = max(int(w * 0.15), 25)
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_len, 1))
    line_mask = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
    ruling_pixels = int(np.count_nonzero(line_mask))
    # Remove the mask *only* if it looks like notebook ruling (thin and spans most of width)
    if ruling_pixels > 0:
        # estimate thickness by vertical projection of the mask
        vertical_sum = line_mask.sum(axis=1)
        thickness = np.count_nonzero(vertical_sum)
        # if the mask is very thin (<=3 rows) and covers >70% of width, treat as ruling
        if thickness <= 3 and np.max(vertical_sum) > 0.7 * w * 255:
            processed = cv2.bitwise_and(binary, cv2.bitwise_not(line_mask))
        else:
            # otherwise keep the original binary (ruling removal would damage strokes)
            processed = binary.copy()
    else:
        processed = binary.copy()
    return processed


def segment_lines(image: Image.Image) -> List[Image.Image]:
    """Detect individual handwritten lines and return them as separate PIL images.

    The algorithm:
    1. Convert to grayscale and produce a binary mask (ink = 255).
    2. Remove horizontal ruling‑line artifacts.
    3. Use the horizontal projection profile (`_detect_line_bands`) to locate line bands.
    4. For each band, compute tight horizontal bounds where ink is present, add a small padding,
       crop the region from the **binary** image and convert back to a RGB PIL Image.
    5. Return the list sorted top‑to‑bottom (the order given by `_detect_line_bands`).
    """
    gray = _to_numpy(image)
    processed = _preprocess_binary(gray)

    # Detect line bands – the function expects a binary foreground mask (bool or 0/255)
    _, bands, _ = _detect_line_bands(processed > 0)
    if not bands:
        return []

    h, w = processed.shape
    padding = 5  # a few pixels around each line for context
    line_images: List[Image.Image] = []

    for band in bands:
        top = max(band["top"] - padding, 0)
        bottom = min(band["bottom"] + padding, h - 1)
        # Determine horizontal extents inside this band where ink exists
        band_mask = processed[top : bottom + 1]
        cols = np.where(band_mask.any(axis=0))[0]
        if cols.size == 0:
            left, right = 0, w - 1
        else:
            left = max(int(cols[0]) - padding, 0)
            right = min(int(cols[-1]) + padding, w - 1)
        crop = processed[top : bottom + 1, left : right + 1]
        # Convert back to RGB for the TrOCR processor (expects 3‑channel images)
        rgb_crop = cv2.cvtColor(crop, cv2.COLOR_GRAY2RGB)
        pil_crop = Image.fromarray(rgb_crop)
        line_images.append(pil_crop)

    return line_images
