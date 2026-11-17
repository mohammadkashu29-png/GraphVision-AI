import io
import base64
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Tuple

class LineSegmenter:
    """
    Automatic line segmentation pipeline based on Horizontal Projection Profile (HPP)
    analysis and ink valley detection. Decomposes multi-line handwritten documents
    into discrete line crops for TrOCR line-level recognition.
    """

    @staticmethod
    def smooth_profile(profile: np.ndarray, window_size: int = 15) -> np.ndarray:
        """Applies a moving average filter to smooth the projection profile."""
        if len(profile) < window_size:
            return profile
        window = np.ones(window_size) / window_size
        return np.convolve(profile, window, mode='same')

    @classmethod
    def segment_lines(
        cls,
        pil_image: Image.Image,
        binary_ink: np.ndarray,
        min_line_height: int = 16,
        min_ink_density_threshold: float = 0.01
    ) -> List[Dict[str, Any]]:
        """
        Segments the image into horizontal text lines using Horizontal Projection Profile (HPP).
        Returns a list of dictionaries with line number, bounding box, crop image (RGB),
        and base64 image data.
        """
        h, w = binary_ink.shape
        
        # Ensure base image is RGB
        rgb_img = pil_image.convert("RGB") if pil_image.mode != "RGB" else pil_image

        # Find overall ink bounds
        ink_rows = np.where(np.sum(binary_ink > 0, axis=1) > 0)[0]
        ink_cols = np.where(np.sum(binary_ink > 0, axis=0) > 0)[0]

        if len(ink_rows) == 0 or len(ink_cols) == 0:
            # Empty image
            return [{
                "line_number": 1,
                "bounding_box": [0, 0, h, w],
                "image_data": cls.pil_to_base64(rgb_img),
                "crop_image": rgb_img,
                "height": h,
                "width": w
            }]

        total_ink_height = int(ink_rows[-1] - ink_rows[0] + 1)
        if total_ink_height < min_line_height * 2:
            # Single line image
            y1 = max(0, int(ink_rows[0]) - 6)
            y2 = min(h, int(ink_rows[-1]) + 7)
            x1 = max(0, int(ink_cols[0]) - 8)
            x2 = min(w, int(ink_cols[-1]) + 9)
            line_crop = rgb_img.crop((x1, y1, x2, y2))
            crop_base64 = cls.pil_to_base64(line_crop)
            return [{
                "line_number": 1,
                "bounding_box": [y1, x1, y2, x2],
                "image_data": crop_base64,
                "crop_image": line_crop,
                "height": y2 - y1,
                "width": x2 - x1
            }]

        # 1. Compute Horizontal Projection Profile (sum of ink pixels per row)
        hpp = np.sum(binary_ink > 0, axis=1).astype(np.float32)
        window = max(7, min(25, h // 40))
        smoothed = cls.smooth_profile(hpp, window_size=window)

        # Dynamic valley threshold based on mean ink
        mean_ink = np.mean(smoothed[ink_rows[0]:ink_rows[-1] + 1])
        valley_threshold = max(1.5, mean_ink * min_ink_density_threshold * 8)

        # 2. Identify candidate text line regions
        in_line = False
        start_y = 0
        raw_intervals: List[Tuple[int, int]] = []

        for y in range(ink_rows[0], ink_rows[-1] + 1):
            has_ink = smoothed[y] > valley_threshold
            if has_ink and not in_line:
                in_line = True
                start_y = y
            elif not has_ink and in_line:
                in_line = False
                end_y = y
                if (end_y - start_y) >= min_line_height:
                    raw_intervals.append((start_y, end_y))

        if in_line:
            end_y = ink_rows[-1] + 1
            if (end_y - start_y) >= min_line_height:
                raw_intervals.append((start_y, end_y))

        # If no valleys split the lines, treat the entire ink region as single line
        if not raw_intervals:
            raw_intervals = [(int(ink_rows[0]), int(ink_rows[-1] + 1))]

        # 3. Refine horizontal bounds (xmin, xmax) for each detected line
        segmented_lines = []
        line_num = 1

        for (y_start, y_end) in raw_intervals:
            # Pad slightly vertically
            y1 = max(0, y_start - 6)
            y2 = min(h, y_end + 6)
            
            # Find horizontal extent of ink in this vertical band
            line_ink_strip = binary_ink[y1:y2, :]
            vpp = np.sum(line_ink_strip > 0, axis=0)
            line_ink_cols = np.where(vpp > 0)[0]

            if len(line_ink_cols) > 0:
                x1 = max(0, int(line_ink_cols[0]) - 8)
                x2 = min(w, int(line_ink_cols[-1]) + 8)
            else:
                x1 = max(0, int(ink_cols[0]) - 8)
                x2 = min(w, int(ink_cols[-1]) + 8)

            # Crop line from RGB image
            line_crop = rgb_img.crop((x1, y1, x2, y2))
            crop_base64 = cls.pil_to_base64(line_crop)

            segmented_lines.append({
                "line_number": line_num,
                "bounding_box": [y1, x1, y2, x2],
                "image_data": crop_base64,
                "crop_image": line_crop,
                "height": y2 - y1,
                "width": x2 - x1
            })
            line_num += 1

        return segmented_lines

    @staticmethod
    def pil_to_base64(img: Image.Image) -> str:
        """Converts PIL image to PNG base64 data URI."""
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        encoded = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"
