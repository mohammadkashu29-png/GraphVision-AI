"""
Vision OCR Model using OpenAI's vision-capable API.

Reads OPENAI_API_KEY and OPENAI_HTR_MODEL from environment variables.
Never hard-codes credentials or model names.
Falls back gracefully if the API key is not configured.
"""

import os
import base64
import logging
import io
from typing import Optional

from PIL import Image

logger = logging.getLogger("vision_ocr")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [VisionOCR] %(message)s")
    ch.setFormatter(formatter)
    logger.addHandler(ch)

# ── Environment variables ──────────────────────────────────────────────────
OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
OPENAI_HTR_MODEL: str = os.getenv("OPENAI_HTR_MODEL", "gpt-4o")

# ── Prompt (exact user specification) ─────────────────────────────────────
OCR_PROMPT = """You are a handwriting OCR engine.
Read ONLY the handwritten text visible in the provided image.
Return the transcription of the handwriting as accurately as possible.
Rules:
- Return ONLY the transcribed text.
- Do not explain your answer.
- Do not describe the image.
- Do not add any commentary, preamble, or suffix.
- Do not say "The image shows" or "The handwriting reads".
- If you cannot read the text clearly, return your best guess.
- Preserve line breaks if multiple lines are visible.
- Do not add punctuation that is not in the original handwriting."""

# Minimum crop height in pixels before we upscale
_MIN_HEIGHT_PX = 32


def _encode_pil_to_base64(pil_image: Image.Image) -> str:
    """Encode a PIL image to a PNG base64 string."""
    buf = io.BytesIO()
    pil_image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _upscale_if_tiny(pil_image: Image.Image, min_height: int = _MIN_HEIGHT_PX) -> Image.Image:
    """
    Upscale the image moderately if it is extremely small (height < min_height),
    preserving aspect ratio using high-quality LANCZOS interpolation.
    """
    w, h = pil_image.size
    if h < min_height:
        scale = min_height / h
        new_w = max(1, int(w * scale))
        new_h = min_height
        logger.info(f"Upscaling tiny crop from {w}x{h} to {new_w}x{new_h} before sending to Vision OCR")
        pil_image = pil_image.resize((new_w, new_h), Image.LANCZOS)
    return pil_image


class VisionOCRModel:
    """
    Wraps the OpenAI vision API for handwriting OCR.

    Attributes:
        is_configured (bool): True only when OPENAI_API_KEY is present in the environment.
        model_name (str): The model to use (from OPENAI_HTR_MODEL env var).
    """

    def __init__(self):
        self.model_name: str = OPENAI_HTR_MODEL
        self.is_configured: bool = bool(OPENAI_API_KEY)
        self._client = None

        if self.is_configured:
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=OPENAI_API_KEY)
                logger.info(
                    f"OpenAI Vision OCR configured. Model: '{self.model_name}'"
                )
            except ImportError:
                logger.error(
                    "openai package is not installed. "
                    "Run: python -m pip install openai"
                )
                self.is_configured = False
            except Exception as e:
                logger.error(f"Failed to initialise OpenAI client: {e}")
                self.is_configured = False
        else:
            logger.warning(
                "OPENAI_API_KEY is not set. OpenAI Vision OCR is unavailable. "
                "TrOCR will be used as the primary OCR engine."
            )

    def recognize_line(self, crop_pil_image: Image.Image) -> Optional[str]:
        """
        Send a single handwriting line crop to the OpenAI vision model and return
        the transcribed text, or None if the call fails or is not configured.

        Args:
            crop_pil_image: A PIL.Image (RGB) of a single handwriting line.

        Returns:
            Transcribed text string, or None on failure.
        """
        if not self.is_configured or self._client is None:
            return None

        # Ensure RGB
        if crop_pil_image.mode != "RGB":
            crop_pil_image = crop_pil_image.convert("RGB")

        # Upscale tiny crops to preserve character legibility
        crop_pil_image = _upscale_if_tiny(crop_pil_image)

        crop_w, crop_h = crop_pil_image.size
        logger.info(f"Encoding crop ({crop_w}x{crop_h}px) as PNG/base64 for Vision OCR")

        image_b64 = _encode_pil_to_base64(crop_pil_image)

        try:
            response = self._client.responses.create(
                model=self.model_name,
                input=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "input_text", "text": OCR_PROMPT},
                            {
                                "type": "input_image",
                                "image_url": f"data:image/png;base64,{image_b64}",
                            },
                        ],
                    }
                ],
            )
            text: str = response.output_text.strip()
            logger.info(f"OpenAI Vision OCR result: '{text}'")
            return text if text else None

        except Exception as e:
            logger.error(
                f"OpenAI Vision OCR call failed: {type(e).__name__}: {e}"
            )
            return None
