# Canonical feature order matches the paper's feature vector F = [D, H, W, S, Ng, Gavg, θ, L]  (Eq. 9)
FEATURE_ORDER = [
    "ink_density", "writing_height", "writing_width", "stroke_width",
    "word_spaces", "average_gap", "baseline_angle", "handwriting_lines",
]

FEATURES = {
    "ink_density": {
        "name": "Ink Density", "unit": "ratio (0–1)", "decimals": 4,
        "explanation": "Proportion of foreground (ink) pixels in the processed binary image. A density measure of how much of the page the writing covers.",
        "formula": "D = Nf / Nt",
    },
    "writing_height": {
        "name": "Writing Height", "unit": "px", "decimals": 0,
        "explanation": "Bounding-box height of the detected handwriting region. Pixel-based, so it depends on image resolution and scale.",
        "formula": "H = ymax − ymin",
    },
    "writing_width": {
        "name": "Writing Width", "unit": "px", "decimals": 0,
        "explanation": "Bounding-box width of the detected handwriting region. Pixel-based, so it depends on image resolution and scale.",
        "formula": "W = xmax − xmin",
    },
    "stroke_width": {
        "name": "Estimated Stroke Width", "unit": "px", "decimals": 4,
        "explanation": "Distance-transform approximation of ink thickness. This is an image-based approximation, not a physical pen-pressure measurement.",
        "formula": "S ≈ 2 · d̄",
    },
    "word_spaces": {
        "name": "Candidate Word Spaces", "unit": "count", "decimals": 0,
        "explanation": "Runs of low-foreground columns found in the vertical projection. Detected gaps are candidates and are not guaranteed to correspond to true word boundaries.",
        "formula": "V(x) = Σ B(x,y); count low-foreground runs",
    },
    "average_gap": {
        "name": "Average Gap", "unit": "px", "decimals": 4,
        "explanation": "Mean width of the detected candidate gaps between ink regions.",
        "formula": "G_avg = (1/n) Σ Gᵢ",
    },
    "baseline_angle": {
        "name": "Baseline-Related Angle", "unit": "degrees (°)", "decimals": 4,
        "explanation": "Preliminary line-position trend from a linear fit of detected handwriting-line positions. Not a validated letter-slant or baseline measurement. Null when fewer than two lines are detected.",
        "formula": "y = m·x + c;  θ = tan⁻¹(m)",
    },
    "handwriting_lines": {
        "name": "Handwriting Lines", "unit": "count", "decimals": 0,
        "explanation": "Number of horizontal handwriting regions detected via peak analysis of the horizontal projection.",
        "formula": "P(y) = Σ B(x,y); peak detection",
    },
}


def feature_rows(features: dict):
    rows = []
    for key in FEATURE_ORDER:
        meta = FEATURES[key]
        value = features.get(key)
        if value is not None and meta["decimals"] > 0:
            value = round(float(value), meta["decimals"])
        rows.append({
            "key": key,
            "name": meta["name"],
            "value": value,
            "unit": meta["unit"],
            "explanation": meta["explanation"],
            "formula": meta["formula"],
        })
    return rows
