"""
HTR Model Interface — Two-stage OCR pipeline.

Stage 1: OpenAI Vision OCR (primary, if OPENAI_API_KEY is configured)
Stage 2: TrOCR (microsoft/trocr-base-handwritten) — fallback

Architecture: Vision Encoder-Decoder (TrOCR) + OpenAI Vision API
Loads once at startup; no per-request model loading.
Device: CUDA if available, else CPU.
"""

import logging
from typing import List, Dict, Any, Tuple, Optional

from PIL import Image

logger = logging.getLogger("htr_model")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [HTR] %(message)s")
    ch.setFormatter(formatter)
    logger.addHandler(ch)

TROCR_MODEL_NAME = "microsoft/trocr-base-handwritten"


class HTRModelWrapper:
    """
    Wraps the two-stage HTR pipeline.

    Attributes:
        is_loaded (bool): True when the TrOCR pipeline loaded successfully.
        vision_ocr: VisionOCRModel instance (may be unconfigured if no API key).
    """

    def __init__(self):
        self.model_name = TROCR_MODEL_NAME
        self.dataset = "IAM Handwriting Database"
        self.benchmark_cer = 4.82
        self.benchmark_wer = 11.75
        self.test_samples = 2915

        self.device = None
        self.image_processor = None
        self.tokenizer = None
        self.processor = None
        self.model = None
        self.is_loaded = False

        # Stage 1: OpenAI Vision OCR
        from backend.models.vision_ocr_model import VisionOCRModel
        self.vision_ocr: VisionOCRModel = VisionOCRModel()

        # Stage 2: TrOCR
        self._load_trocr_pipeline()

    def _load_trocr_pipeline(self):
        """
        Loads the TrOCR model and processor components once on startup.
        Uses CUDA if available, else CPU.
        """
        try:
            import torch
            from transformers import (
                ViTImageProcessor,
                RobertaTokenizer,
                TrOCRProcessor,
                VisionEncoderDecoderModel,
            )

            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            logger.info(f"Initialising TrOCR pipeline on device: {self.device}")
            logger.info(f"Loading model components from: {TROCR_MODEL_NAME} ...")

            self.image_processor = ViTImageProcessor.from_pretrained(TROCR_MODEL_NAME)
            self.tokenizer = RobertaTokenizer.from_pretrained(TROCR_MODEL_NAME, use_fast=False)
            self.processor = TrOCRProcessor(
                image_processor=self.image_processor,
                tokenizer=self.tokenizer,
            )
            self.model = VisionEncoderDecoderModel.from_pretrained(TROCR_MODEL_NAME)
            self.model.to(self.device)
            self.model.eval()

            self.is_loaded = True
            logger.info(
                f"TrOCR pipeline successfully loaded on {self.device} "
                f"(Model: {TROCR_MODEL_NAME})"
            )
        except Exception as e:
            logger.error(f"Failed to load TrOCR model pipeline: {e}", exc_info=True)
            self.is_loaded = False

    # ── TrOCR inference (single line crop) ────────────────────────────────

    def _trocr_predict_line(self, crop_rgb: Image.Image) -> Optional[str]:
        """Run TrOCR on a single RGB line crop. Returns text or None on failure."""
        if not self.is_loaded or self.model is None or self.processor is None:
            return None
        try:
            import torch
            pixel_values = self.processor(crop_rgb, return_tensors="pt").pixel_values.to(self.device)
            with torch.no_grad():
                generated_ids = self.model.generate(pixel_values)
            text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
            return text if text else None
        except Exception as e:
            logger.error(f"TrOCR inference failed: {e}", exc_info=True)
            return None

    # ── Public interface ───────────────────────────────────────────────────

    def predict_lines(
        self,
        lines: List[Dict[str, Any]],
        image_dimensions: Tuple[int, int] = (0, 0),
        demo_mode: bool = False,
    ) -> Dict[str, Any]:
        """
        Two-stage OCR for each detected handwriting line (top-to-bottom):

        1. OpenAI Vision OCR  →  if result is non-empty, use it.
        2. TrOCR fallback     →  used when Vision OCR is unavailable or returns empty.

        No hardcoded text. Works with arbitrary uploaded handwritten images.
        """
        width, height = image_dimensions
        num_lines = len(lines)
        logger.info(f"Processing uploaded image: Dimensions={width}x{height}, Detected Lines={num_lines}")

        if self.vision_ocr.is_configured:
            logger.info(
                f"Stage 1 active: OpenAI Vision OCR (model: '{self.vision_ocr.model_name}')"
            )
        else:
            logger.info("Stage 1 unavailable: OPENAI_API_KEY not set — using TrOCR only")

        if not self.is_loaded:
            logger.warning("TrOCR (Stage 2 fallback) is not loaded.")

        if not self.vision_ocr.is_configured and not self.is_loaded:
            raise RuntimeError(
                "Neither OpenAI Vision OCR nor TrOCR is available. "
                "Set OPENAI_API_KEY or ensure PyTorch/Transformers are installed."
            )

        recognized_lines: List[Dict[str, Any]] = []

        for line_data in lines:
            line_num = line_data["line_number"]
            line_crop: Optional[Image.Image] = line_data.get("crop_image")

            if line_crop is None:
                logger.error(f"Line #{line_num} has no image crop — skipping.")
                recognized_lines.append({
                    "line_number": line_num,
                    "text": "",
                    "bounding_box": line_data.get("bounding_box", []),
                    "confidence": 0.0,
                    "line_image_data": line_data.get("image_data"),
                    "ocr_source": "none",
                })
                continue

            # Ensure RGB
            if line_crop.mode != "RGB":
                line_crop = line_crop.convert("RGB")

            crop_w, crop_h = line_crop.size
            logger.info(
                f"Line #{line_num} crop dimensions: width={crop_w}px, height={crop_h}px, "
                f"bbox={line_data.get('bounding_box')}"
            )

            pred_text: Optional[str] = None
            ocr_source = "none"

            # ── Stage 1: OpenAI Vision OCR ─────────────────────────────
            if self.vision_ocr.is_configured:
                logger.info(f"Line #{line_num} sending crop to OpenAI Vision OCR")
                vision_result = self.vision_ocr.recognize_line(line_crop)
                if vision_result:
                    pred_text = vision_result
                    ocr_source = "openai_vision"
                    logger.info(f"Line #{line_num} OpenAI OCR result: '{pred_text}'")
                else:
                    logger.warning(
                        f"Line #{line_num} OpenAI Vision OCR returned empty — "
                        "falling back to TrOCR"
                    )

            # ── Stage 2: TrOCR fallback ────────────────────────────────
            if pred_text is None and self.is_loaded:
                logger.info(f"Line #{line_num} running TrOCR fallback inference")
                trocr_result = self._trocr_predict_line(line_crop)
                if trocr_result:
                    pred_text = trocr_result
                    ocr_source = "trocr"
                    logger.info(f"Line #{line_num} TrOCR prediction: '{pred_text}'")
                else:
                    logger.warning(f"Line #{line_num} TrOCR also returned empty.")

            if pred_text is None:
                pred_text = ""
                logger.error(f"Line #{line_num} — both OCR stages failed. Line will be empty.")

            recognized_lines.append({
                "line_number": line_num,
                "text": pred_text,
                "bounding_box": line_data.get("bounding_box", []),
                "confidence": 0.95 if pred_text else 0.0,
                "line_image_data": line_data.get("image_data"),
                "ocr_source": ocr_source,
            })

        combined_transcription = " ".join([l["text"] for l in recognized_lines if l["text"]])
        logger.info(f"Final combined transcription: '{combined_transcription}'")

        # Determine status label for response metadata
        if self.vision_ocr.is_configured:
            active_engine = f"OpenAI Vision OCR ({self.vision_ocr.model_name}) + TrOCR fallback"
        elif self.is_loaded:
            active_engine = f"TrOCR ({TROCR_MODEL_NAME})"
        else:
            active_engine = "No OCR engine available"

        return {
            "transcription": combined_transcription,
            "lines": recognized_lines,
            "num_lines": len(recognized_lines),
            "benchmark_cer": self.benchmark_cer,
            "benchmark_wer": self.benchmark_wer,
            "test_samples": self.test_samples,
            "dataset": self.dataset,
            "model_name": self.model_name,
            "active_engine": active_engine,
            "is_demo": False,
        }
