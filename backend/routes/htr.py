import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from backend.services.preprocessing import ImagePreprocessor
from backend.services.line_segmentation import LineSegmenter
from backend.models.htr_model import HTRModelWrapper
from backend.schemas.responses import HTRResponse

logger = logging.getLogger("htr_route")
router = APIRouter(prefix="/api/htr", tags=["Handwritten Text Recognition"])

# Loaded ONCE when the backend starts — HTRModelWrapper creates its own VisionOCRModel
htr_model = HTRModelWrapper()
# Expose vision_ocr for status reporting in main.py
vision_ocr = htr_model.vision_ocr

@router.post("/predict", response_model=HTRResponse)
async def predict_htr(
    image: UploadFile = File(..., description="Handwritten document image (PNG/JPG/JPEG)"),
    demo_mode: Optional[bool] = Form(False, description="Enable simulated demo mode if weights are pending")
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image (PNG, JPG, JPEG).")

    contents = await image.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty image uploaded.")

    try:
        # 1. Preprocess: Otsu binarization, deskewing, ink analysis
        preprocessed = ImagePreprocessor.preprocess_pipeline(contents)
        w, h = preprocessed["width"], preprocessed["height"]
        logger.info(f"Received image: filename='{image.filename}', dimensions={w}x{h}, ink_density={preprocessed['ink_density']}")
        
        # 2. Line Segmentation: Horizontal projection profile analysis
        segmented_lines = LineSegmenter.segment_lines(
            pil_image=preprocessed["pil_image"],
            binary_ink=preprocessed["binary_ink"]
        )
        logger.info(f"Line segmentation completed: {len(segmented_lines)} line(s) detected.")

        # 3. Real TrOCR Inference Pipeline (line-by-line, top-to-bottom)
        result = htr_model.predict_lines(
            lines=segmented_lines,
            image_dimensions=(w, h),
            demo_mode=demo_mode
        )
        
        # Attach preprocessing metadata
        result["preprocessing_info"] = {
            "width": w,
            "height": h,
            "skew_angle": preprocessed["skew_angle"],
            "otsu_threshold": preprocessed["otsu_threshold"],
            "ink_density": preprocessed["ink_density"],
            "lines_detected": len(segmented_lines)
        }

        return result
    except Exception as e:
        logger.error(f"Error during HTR processing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"HTR processing error: {str(e)}")
