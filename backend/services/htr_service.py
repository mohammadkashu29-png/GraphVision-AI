"""Lazy-loaded TrOCR handwriting recognition service.

The model is downloaded from Hugging Face on the first recognition request,
then kept in memory for subsequent requests. No simulated result is returned.
"""
from __future__ import annotations

import os
import base64
import importlib.util
import threading
import time
from typing import Any

import torch
from PIL import Image, UnidentifiedImageError
from io import BytesIO

MODEL_ID = os.getenv("GRAPHVISION_TROCR_MODEL", "microsoft/trocr-base-handwritten")
_lock = threading.Lock()
_processor: Any = None
_model: Any = None
_load_error: str | None = None


def _load_model():
    global _processor, _model, _load_error
    if _processor is not None and _model is not None:
        return _processor, _model
    with _lock:
        if _processor is not None and _model is not None:
            return _processor, _model
        # Do not permanently cache a failed load: a transient network/Hugging Face
        # error should be retryable on the next request without restarting the API.
        _load_error = None
        try:
            from transformers import TrOCRProcessor, VisionEncoderDecoderModel
            processor = TrOCRProcessor.from_pretrained(MODEL_ID)
            model = VisionEncoderDecoderModel.from_pretrained(MODEL_ID)
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            model.to(device)
            model.eval()
            _processor, _model = processor, model
            return _processor, _model
        except Exception as exc:
            _load_error = (
                f"Could not load TrOCR model '{MODEL_ID}'. Check internet access, "
                f"Hugging Face availability, and installed dependencies. Details: {exc}"
            )
            raise RuntimeError(_load_error) from exc


def model_status() -> dict:
    dependency_installed = importlib.util.find_spec("transformers") is not None
    error = _load_error
    if not dependency_installed and error is None:
        error = "The transformers package is not installed. Run: pip install -r requirements.txt"
    return {
        "available": dependency_installed,
        "dependency_installed": dependency_installed,
        "model_id": MODEL_ID,
        "loaded": _processor is not None and _model is not None,
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "error": error,
        "load_on_first_request": True,
    }


def recognize_handwriting(image_bytes: bytes) -> dict:
    """Recognize handwritten text, supporting multi‑line images.

    Steps:
    1. Load the image (RGB).
    2. Segment it into individual line images using `segment_lines`.
    3. If segmentation yields >=1 line, run TrOCR on each line **using the same loaded model**.
       Concatenate the per‑line predictions with newline characters.
    4. If segmentation fails (no lines detected or any exception), fall back to the original
       single‑image inference and set `fallback: true` in the response.
    The returned dict always contains the original backward‑compatible fields plus the
    new `line_count`, `lines`, optional `line_images`, and `fallback` flag.
    """
    # Load image
    try:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("The uploaded file is not a readable image.") from exc

    if image.width < 32 or image.height < 16:
        raise ValueError("Image is too small for handwriting recognition. Upload a clearer, larger image.")

    # Load model once (lazy)
    processor, model = _load_model()
    device = next(model.parameters()).device

    # ---------------------------------------------------
    # Attempt multi‑line segmentation
    # ---------------------------------------------------
    from .line_segmentation import segment_lines
    try:
        line_imgs = segment_lines(image)
    except Exception as exc:
        # Logically we could use a logger; for now we treat it as a fallback trigger
        line_imgs = []
        fallback = True
    else:
        fallback = False

    if line_imgs:
        # Run TrOCR on each line individually
        line_texts: list[str] = []
        line_data_uris: list[str] = []
        start = time.perf_counter()
        for li in line_imgs:
            # The processor expects a PIL.Image (RGB). Ensure format.
            pixel_values = processor(images=li, return_tensors="pt").pixel_values.to(device)
            with torch.inference_mode():
                generated_ids = model.generate(pixel_values, max_new_tokens=128)
            txt = processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
            line_texts.append(txt)
            # Encode line image as PNG data URI for UI display (optional but cheap)
            buf = BytesIO()
            li.save(buf, format="PNG")
            line_data_uris.append("data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii"))
        elapsed_ms = (time.perf_counter() - start) * 1000
        combined_text = "\n".join(line_texts)
        result = {
            "text": combined_text,
            "model_id": MODEL_ID,
            "device": str(device),
            "processing_time_ms": round(elapsed_ms, 2),
            "image_width": image.width,
            "image_height": image.height,
            "disclaimer": "TrOCR output is an automated transcription and may contain recognition errors. Review it against the original image.",
            "line_count": len(line_imgs),
            "lines": line_texts,
            "line_images": line_data_uris,
            "fallback": False,
        }
        return result

    # ---------------------------------------------------
    # Fallback: treat whole image as a single line
    # ---------------------------------------------------
    start = time.perf_counter()
    pixel_values = processor(images=image, return_tensors="pt").pixel_values.to(device)
    with torch.inference_mode():
        generated_ids = model.generate(pixel_values, max_new_tokens=128)
    text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
    elapsed_ms = (time.perf_counter() - start) * 1000
    return {
        "text": text,
        "model_id": MODEL_ID,
        "device": str(device),
        "processing_time_ms": round(elapsed_ms, 2),
        "image_width": image.width,
        "image_height": image.height,
        "disclaimer": "TrOCR output is an automated transcription and may contain recognition errors. Review it against the original image.",
        "line_count": 1,
        "lines": [text],
        "fallback": True,
    }
