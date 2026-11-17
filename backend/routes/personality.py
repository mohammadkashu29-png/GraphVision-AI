from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from backend.services.preprocessing import ImagePreprocessor
from backend.services.line_segmentation import LineSegmenter
from backend.services.feature_extraction import HandwritingFeatureExtractor
from backend.models.personality_model import PersonalityAnalysisModel
from backend.schemas.responses import PersonalityResponse

router = APIRouter(prefix="/api/personality", tags=["Handwriting Personality Analysis"])

@router.post("/analyze", response_model=PersonalityResponse)
async def analyze_personality(
    image: UploadFile = File(..., description="Handwriting sample image"),
    demo_mode: Optional[bool] = Form(False, description="Enable presentation demo mode")
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image.")

    contents = await image.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    try:
        # 1. Preprocessing
        preprocessed = ImagePreprocessor.preprocess_pipeline(contents)

        # 2. Line Segmentation for character spacing & line height analysis
        lines_info = LineSegmenter.segment_lines(
            pil_image=preprocessed["pil_image"],
            binary_ink=preprocessed["binary_ink"]
        )

        # 3. Geometric & structural feature extraction
        extracted_features = HandwritingFeatureExtractor.extract_features(
            binary_ink=preprocessed["binary_ink"],
            lines_info=lines_info
        )

        # 4. Experimental Graphology Analysis with Scientific Disclaimer
        result = PersonalityAnalysisModel.analyze(extracted_features, demo_mode=demo_mode)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Personality analysis error: {str(e)}")
