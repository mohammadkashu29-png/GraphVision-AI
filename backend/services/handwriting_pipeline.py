import os
import json
from typing import List, Dict, Any

from .preprocessing import ImagePreprocessor
from .line_segmentation import LineSegmenter
from .feature_extraction import HandwritingFeatureExtractor

# Default metrics that indicate a sparse/empty image (returned by HandwritingFeatureExtractor._default_features())
_DEFAULT_METRICS = {
    "slant_angle_degrees": 8.5,
    "estimated_char_height_px": 22.0,
    "inter_word_gap_ratio": 1.1,
    "baseline_slope_deg": 0.8,
    "baseline_variance": 14.2,
    "stroke_thickness_px": 2.8,
    "consistency_score": 0.78,
}


def _is_default_metrics(metrics: Dict[str, Any]) -> bool:
    """Return True if the extracted metrics match the hard‑coded defaults for a sparse image.
    This is a pragmatic way to detect the fallback case without modifying the upstream
    feature extractor implementation.
    """
    return all(abs(metrics.get(k, 0) - v) < 1e-6 for k, v in _DEFAULT_METRICS.items())


def analyze_handwriting(image_bytes: bytes) -> List[Dict[str, Any]]:
    """Run the full backend pipeline on a raw image.

    Returns a list with a single dictionary containing a ``features`` key that maps to
    the eight numeric features required by the research pipeline.
    If the image is considered sparse/empty, a ``ValueError`` is raised so that the
    calling code can treat the sample as invalid.
    """
    # 1️⃣ Pre‑process the image
    pre = ImagePreprocessor.preprocess_pipeline(image_bytes)

    # 2️⃣ Segment lines (the function may return an empty list for blank images)
    # The LineSegmenter expects both the original PIL image and the binary ink mask.
    lines_info = LineSegmenter.segment_lines(pre["pil_image"], pre["binary_ink"])

    # 3️⃣ Extract quantitative metrics
    extraction = HandwritingFeatureExtractor.extract_features(pre["binary_ink"], lines_info)
    metrics = extraction.get("metrics", {})

    # 4️⃣ Reject sparse/empty images – they yield the hard‑coded default metric set
    if _is_default_metrics(metrics):
        raise ValueError("Sparse or empty handwriting image – cannot extract reliable features.")

    # 5️⃣ Assemble the eight numeric features required by the personality pipeline
    features = {
        "ink_density": pre["ink_density"],
        "slant_angle_degrees": metrics["slant_angle_degrees"],
        "estimated_char_height_px": metrics["estimated_char_height_px"],
        "inter_word_gap_ratio": metrics["inter_word_gap_ratio"],
        "baseline_slope_deg": metrics["baseline_slope_deg"],
        "baseline_variance": metrics["baseline_variance"],
        "stroke_thickness_px": metrics["stroke_thickness_px"],
        "consistency_score": metrics["consistency_score"],
    }

    return [{"features": features}]
