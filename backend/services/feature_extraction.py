import math
import numpy as np
from typing import Dict, Any, List, Tuple
from PIL import Image

class HandwritingFeatureExtractor:
    """
    Extracts geometric, structural, and statistical features from handwriting samples.
    Used for writer identification feature vectors and experimental graphology associations.
    """

    @classmethod
    def extract_features(cls, binary_ink: np.ndarray, lines_info: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Calculates physical handwriting features from the binary ink matrix.
        Returns categorical descriptors and quantitative metrics.
        """
        h, w = binary_ink.shape
        ink_coords = np.argwhere(binary_ink > 0)
        
        if len(ink_coords) < 50:
            # Fallback for sparse or empty images
            return cls._default_features()

        # 1. Slant Angle Estimation using moment / shear projection
        slant_deg = cls._estimate_slant(binary_ink, ink_coords)
        slant_category = cls._categorize_slant(slant_deg)

        # 2. Letter Size Estimation
        avg_char_height, size_category = cls._estimate_size(binary_ink, lines_info)

        # 3. Spacing Estimation (Word and Character gaps)
        gap_ratio, spacing_category = cls._estimate_spacing(binary_ink)

        # 4. Baseline Tendency & Stability
        baseline_slope, baseline_var, baseline_category = cls._estimate_baseline(binary_ink, ink_coords)

        # 5. Pen Pressure Proxy (Stroke thickness / density)
        stroke_thickness, pressure_category = cls._estimate_stroke_thickness(binary_ink)

        # 6. Writing Consistency
        consistency_score, consistency_category = cls._estimate_consistency(binary_ink, slant_deg, avg_char_height)

        return {
            "slant": slant_category,
            "letter_size": size_category,
            "spacing": spacing_category,
            "baseline": baseline_category,
            "consistency": consistency_category,
            "pen_pressure": pressure_category,
            "metrics": {
                "slant_angle_degrees": round(float(slant_deg), 2),
                "estimated_char_height_px": round(float(avg_char_height), 1),
                "inter_word_gap_ratio": round(float(gap_ratio), 2),
                "baseline_slope_deg": round(float(baseline_slope), 2),
                "baseline_variance": round(float(baseline_var), 2),
                "stroke_thickness_px": round(float(stroke_thickness), 2),
                "consistency_score": round(float(consistency_score), 2)
            }
        }

    @staticmethod
    def _estimate_slant(binary_ink: np.ndarray, ink_coords: np.ndarray) -> float:
        """
        Estimates handwriting slant angle using image moments or directional shear.
        Returns angle in degrees (-30 to +30; positive is right slant).
        """
        y = ink_coords[:, 0]
        x = ink_coords[:, 1]
        
        # Center coordinates
        y_mean = np.mean(y)
        x_mean = np.mean(x)
        y_c = y - y_mean
        x_c = x - x_mean
        
        # Central moments
        mu20 = np.mean(x_c ** 2)
        mu02 = np.mean(y_c ** 2)
        mu11 = np.mean(x_c * y_c)
        
        # Invert y because image row 0 is top
        mu11_corrected = -mu11
        
        if abs(mu20 - mu02) < 1e-5:
            angle_rad = 0.0
        else:
            angle_rad = 0.5 * math.atan2(2 * mu11_corrected, (mu20 - mu02))
        
        angle_deg = math.degrees(angle_rad)
        # Constrain to plausible handwriting range [-35, 35]
        angle_deg = max(-35.0, min(35.0, angle_deg))
        return angle_deg

    @staticmethod
    def _categorize_slant(angle_deg: float) -> str:
        if angle_deg < -10:
            return "Left Slant"
        elif -10 <= angle_deg <= -3:
            return "Slight Left"
        elif -3 < angle_deg <= 3:
            return "Upright / Vertical"
        elif 3 < angle_deg <= 16:
            return "Moderate Right"
        else:
            return "Pronounced Right"

    @staticmethod
    def _estimate_size(binary_ink: np.ndarray, lines_info: List[Dict[str, Any]] = None) -> Tuple[float, str]:
        if lines_info and len(lines_info) > 0:
            heights = [l["height"] for l in lines_info]
            # Character x-height is typically ~40% of line height
            avg_height = np.median(heights) * 0.42
        else:
            h, w = binary_ink.shape
            v_slices = np.sum(binary_ink > 0, axis=1)
            active_rows = np.count_nonzero(v_slices > 5)
            avg_height = max(12.0, active_rows / 4.0)

        if avg_height < 16:
            return avg_height, "Small"
        elif avg_height <= 28:
            return avg_height, "Medium"
        else:
            return avg_height, "Large"

    @staticmethod
    def _estimate_spacing(binary_ink: np.ndarray) -> Tuple[float, str]:
        # Calculate horizontal white runs along center lines
        h, w = binary_ink.shape
        sample_rows = np.linspace(h * 0.2, h * 0.8, 10, dtype=int)
        gap_lengths = []

        for r in sample_rows:
            row = binary_ink[r, :] > 0
            diff = np.diff(row.astype(int))
            # falling edges = gap start, rising edges = gap end
            starts = np.where(diff == -1)[0]
            ends = np.where(diff == 1)[0]
            if len(starts) > 0 and len(ends) > 0:
                for s in starts:
                    subsequent_ends = ends[ends > s]
                    if len(subsequent_ends) > 0:
                        gap_lengths.append(subsequent_ends[0] - s)

        if gap_lengths:
            median_gap = float(np.median(gap_lengths))
        else:
            median_gap = 14.0

        gap_ratio = median_gap / (w * 0.05 + 1e-5)
        if median_gap < 10:
            return gap_ratio, "Narrow"
        elif median_gap <= 24:
            return gap_ratio, "Moderate"
        else:
            return gap_ratio, "Wide"

    @staticmethod
    def _estimate_baseline(binary_ink: np.ndarray, ink_coords: np.ndarray) -> Tuple[float, float, str]:
        y = ink_coords[:, 0]
        x = ink_coords[:, 1]
        
        # Fit linear regression to lower quartile of y coordinates
        q75 = np.percentile(y, 70)
        baseline_points = ink_coords[y >= q75]
        
        if len(baseline_points) < 20:
            return 0.0, 1.0, "Mostly Stable"

        bx = baseline_points[:, 1]
        by = baseline_points[:, 0]

        # Fit line: by = slope * bx + intercept
        p = np.polyfit(bx, by, 1)
        slope = p[0]
        # Invert y-axis for standard math slope
        slope_deg = -math.degrees(math.atan(slope))

        # Residual variance
        preds = np.polyval(p, bx)
        variance = float(np.var(preds - by))

        if variance > 120:
            category = "Fluctuating / Irregular"
        elif slope_deg > 3.0:
            category = "Ascending"
        elif slope_deg < -3.0:
            category = "Descending"
        else:
            category = "Mostly Stable"

        return slope_deg, variance, category

    @staticmethod
    def _estimate_stroke_thickness(binary_ink: np.ndarray) -> Tuple[float, str]:
        # Count horizontal ink runs
        ink_pixel_count = np.count_nonzero(binary_ink)
        diff_h = np.diff((binary_ink > 0).astype(int), axis=1)
        transitions = np.count_nonzero(diff_h != 0) / 2.0
        
        if transitions > 0:
            thickness = ink_pixel_count / transitions
        else:
            thickness = 2.5

        if thickness < 2.0:
            category = "Light Pressure Proxy"
        elif thickness <= 4.2:
            category = "Moderate Pressure Proxy"
        else:
            category = "Firm / Heavy Pressure Proxy"

        return thickness, category

    @staticmethod
    def _estimate_consistency(binary_ink: np.ndarray, slant_deg: float, avg_height: float) -> Tuple[float, str]:
        # Consistency is calculated from regularity of stroke profile
        h, w = binary_ink.shape
        col_sums = np.sum(binary_ink > 0, axis=0)
        active_cols = col_sums[col_sums > 0]
        
        if len(active_cols) > 0:
            cv = np.std(active_cols) / (np.mean(active_cols) + 1e-6)
            # Normalise to 0-1 score
            consistency_score = max(0.1, min(0.95, 1.0 - cv * 0.35))
        else:
            consistency_score = 0.75

        if consistency_score >= 0.72:
            category = "High Consistency"
        elif consistency_score >= 0.50:
            category = "Moderate Consistency"
        else:
            category = "Variable / Freeform"

        return consistency_score, category

    @staticmethod
    def _default_features() -> Dict[str, Any]:
        return {
            "slant": "Moderate Right",
            "letter_size": "Medium",
            "spacing": "Moderate",
            "baseline": "Mostly Stable",
            "consistency": "Moderate Consistency",
            "pen_pressure": "Moderate Pressure Proxy",
            "metrics": {
                "slant_angle_degrees": 8.5,
                "estimated_char_height_px": 22.0,
                "inter_word_gap_ratio": 1.1,
                "baseline_slope_deg": 0.8,
                "baseline_variance": 14.2,
                "stroke_thickness_px": 2.8,
                "consistency_score": 0.78
            }
        }
