import io
import math
import numpy as np
from PIL import Image, ImageOps, ImageFilter
from typing import Tuple, Dict, Any

class ImagePreprocessor:
    """
    Robust image preprocessing pipeline for handwriting documents and signatures.
    Handles grayscale conversion, binarization (Otsu-based), contrast stretching,
    deskewing, and morphological smoothing.
    """

    @staticmethod
    def load_image(image_bytes: bytes) -> Image.Image:
        """Loads and normalizes image orientation from bytes."""
        img = Image.open(io.BytesIO(image_bytes))
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        return img

    @staticmethod
    def to_grayscale(img: Image.Image) -> np.ndarray:
        """Converts PIL Image to normalized grayscale numpy array [0, 255]."""
        gray_img = img.convert("L")
        return np.array(gray_img, dtype=np.uint8)

    @staticmethod
    def compute_otsu_threshold(gray: np.ndarray) -> int:
        """Computes Otsu's optimal global binarization threshold."""
        hist, bin_edges = np.histogram(gray, bins=256, range=(0, 256))
        total_pixels = gray.size
        
        current_max = 0.0
        threshold = 128
        sum_total = np.dot(np.arange(256), hist)
        sum_background = 0.0
        weight_background = 0
        
        for t in range(256):
            weight_background += hist[t]
            if weight_background == 0:
                continue
            weight_foreground = total_pixels - weight_background
            if weight_foreground == 0:
                break
                
            sum_background += t * hist[t]
            mean_background = sum_background / weight_background
            mean_foreground = (sum_total - sum_background) / weight_foreground
            
            # Between-class variance
            var_between = float(weight_background) * float(weight_foreground) * ((mean_background - mean_foreground) ** 2)
            if var_between > current_max:
                current_max = var_between
                threshold = t
                
        return int(threshold)

    @staticmethod
    def binarize(gray: np.ndarray, invert: bool = True) -> np.ndarray:
        """
        Binarizes image using Otsu thresholding.
        If invert=True, foreground ink is 1 (or 255) and background is 0.
        """
        thresh = ImagePreprocessor.compute_otsu_threshold(gray)
        if invert:
            # Ink (dark pixels) becomes 255, background becomes 0
            binary = (gray < thresh).astype(np.uint8) * 255
        else:
            binary = (gray >= thresh).astype(np.uint8) * 255
        return binary

    @staticmethod
    def estimate_skew_angle(binary_ink: np.ndarray) -> float:
        """
        Estimates document skew angle within [-15, 15] degrees using
        horizontal projection profile variance maximization.
        """
        h, w = binary_ink.shape
        if h < 20 or w < 20:
            return 0.0

        # Subsample if large to speed up
        sample = binary_ink[::2, ::2]
        angles = np.linspace(-15.0, 15.0, 31)
        best_variance = -1.0
        best_angle = 0.0

        pil_sample = Image.fromarray(sample)
        for angle in angles:
            rotated = pil_sample.rotate(angle, resample=Image.Resampling.BILINEAR, fillcolor=0)
            arr = np.array(rotated)
            # Profile sum across rows
            profile = np.sum(arr, axis=1)
            # Calculate variance of profile differences
            diff = np.diff(profile)
            variance = np.var(diff)
            if variance > best_variance:
                best_variance = variance
                best_angle = angle

        return float(round(best_angle, 2))

    @classmethod
    def preprocess_pipeline(cls, image_bytes: bytes) -> Dict[str, Any]:
        """
        Full preprocessing pipeline returning processed image array,
        binary ink mask, deskew angle, and dimensions.
        """
        pil_img = cls.load_image(image_bytes)
        w, h = pil_img.size
        gray = cls.to_grayscale(pil_img)
        otsu_th = cls.compute_otsu_threshold(gray)
        binary_ink = cls.binarize(gray, invert=True)
        skew_angle = cls.estimate_skew_angle(binary_ink)

        # Deskew if angle is significant
        if abs(skew_angle) >= 0.75:
            pil_img = pil_img.rotate(skew_angle, resample=Image.Resampling.BICUBIC, expand=False, fillcolor=(255, 255, 255))
            gray = cls.to_grayscale(pil_img)
            binary_ink = cls.binarize(gray, invert=True)

        ink_pixel_count = int(np.count_nonzero(binary_ink))
        ink_density = float(round(ink_pixel_count / (w * h + 1e-6), 4))

        return {
            "pil_image": pil_img,
            "gray_array": gray,
            "binary_ink": binary_ink,
            "width": w,
            "height": h,
            "otsu_threshold": otsu_th,
            "skew_angle": skew_angle,
            "ink_density": ink_density
        }
