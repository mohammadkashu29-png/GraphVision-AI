"""
Handwriting-Based Personality Analysis Model Interface
Experimental Graphology Heuristics Engine with Explicit Scientific Disclaimer

IMPORTANT ACADEMIC NOTICE:
This module maps mathematically extracted geometric handwriting features to traditional
graphological rule-sets strictly for experimental, academic, and demonstrative research purposes.
Personality traits are not scientifically validated by handwriting alone.
"""

from typing import Dict, Any, List

class PersonalityAnalysisModel:
    DISCLAIMER = (
        "This module provides experimental associations based on handwriting characteristics "
        "and graphology-inspired rules. These results are not scientifically validated psychological "
        "or personality assessments and should not be treated as a diagnosis, psychological "
        "evaluation, or factual determination of personality."
    )

    @classmethod
    def analyze(cls, extracted_features: Dict[str, Any], demo_mode: bool = False) -> Dict[str, Any]:
        """
        Derives experimental personality associations based on extracted geometric features.
        """
        slant = extracted_features.get("slant", "Moderate Right")
        size = extracted_features.get("letter_size", "Medium")
        spacing = extracted_features.get("spacing", "Moderate")
        baseline = extracted_features.get("baseline", "Mostly Stable")
        consistency = extracted_features.get("consistency", "High Consistency")
        pen_pressure = extracted_features.get("pen_pressure", "Moderate Pressure Proxy")

        metrics = extracted_features.get("metrics", {})
        slant_deg = metrics.get("slant_angle_degrees", 8.0)
        consistency_score = metrics.get("consistency_score", 0.78)

        # 1. Organization trait score
        # Driven by baseline stability, even margins, and consistent line spacing
        org_base = 0.50
        if "Stable" in baseline:
            org_base += 0.28
        elif "Ascending" in baseline:
            org_base += 0.18
        if "Moderate" in spacing:
            org_base += 0.12
        if "High" in consistency:
            org_base += 0.08
        org_score = round(min(0.96, max(0.35, org_base)), 2)

        # 2. Confidence trait score
        # Driven by stroke thickness (firm pressure), larger size, or ascending baseline
        conf_base = 0.55
        if "Ascending" in baseline:
            conf_base += 0.18
        if "Large" in size:
            conf_base += 0.16
        if "Heavy" in pen_pressure or "Firm" in pen_pressure:
            conf_base += 0.12
        conf_score = round(min(0.95, max(0.40, conf_base)), 2)

        # 3. Consistency trait score
        # Direct derivative of stroke regularity and slant variance
        consistency_trait_score = round(float(consistency_score), 2)

        # 4. Social Orientation trait score
        # In graphology lore, right slant correlates with extroversion/expressiveness, left with reserve
        social_base = 0.50
        if slant_deg > 10:
            social_base += 0.32  # Expressive, outwardly directed
        elif slant_deg > 2:
            social_base += 0.22  # Balanced sociable
        elif slant_deg < -5:
            social_base -= 0.18  # Reflective, self-contained
        social_score = round(min(0.95, max(0.30, social_base)), 2)

        # 5. Attention to Detail trait score
        # Driven by smaller letter size, narrow-to-moderate spacing, high consistency
        detail_base = 0.50
        if "Small" in size:
            detail_base += 0.30  # Focus on minutiae
        elif "Medium" in size:
            detail_base += 0.18
        if "High" in consistency:
            detail_base += 0.15
        detail_score = round(min(0.95, max(0.35, detail_base)), 2)

        associations = [
            {
                "trait": "Organization",
                "score": org_score,
                "interpretation": "Structured spatial arrangement and stable baseline alignment indicate deliberate organization.",
                "derived_from": f"Baseline: {baseline}, Spacing: {spacing}"
            },
            {
                "trait": "Confidence",
                "score": conf_score,
                "interpretation": "Upward trajectory and firm stroke dynamics suggest assertive expressive tendencies.",
                "derived_from": f"Baseline: {baseline}, Size: {size}, Pressure: {pen_pressure}"
            },
            {
                "trait": "Consistency",
                "score": consistency_trait_score,
                "interpretation": "Repetitive stroke rhythms reflect uniform procedural discipline.",
                "derived_from": f"Consistency metric: {consistency}"
            },
            {
                "trait": "Social orientation",
                "score": social_score,
                "interpretation": "Slant inclination reflects communicative posture and interpersonal expressiveness.",
                "derived_from": f"Slant: {slant} ({slant_deg}°)"
            },
            {
                "trait": "Attention to detail",
                "score": detail_score,
                "interpretation": "Controlled character dimensions and careful letter-boundary spacing denote focus.",
                "derived_from": f"Size: {size}, Spacing: {spacing}"
            }
        ]

        return {
            "features": {
                "slant": slant,
                "letter_size": size,
                "spacing": spacing,
                "baseline": baseline,
                "consistency": consistency
            },
            "experimental_associations": associations,
            "disclaimer": cls.DISCLAIMER,
            "raw_metrics": metrics,
            "is_demo": demo_mode
        }
