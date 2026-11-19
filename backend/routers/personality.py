from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File

try:
    from services.personality_service import predict
except (ImportError, ValueError):
    try:
        from backend.services.personality_service import predict
    except (ImportError, ValueError):
        from ..services.personality_service import predict

router = APIRouter()

@router.post("/analyze-personality")
async def analyze_personality(file: UploadFile = File(...)):
    """Accept a single image file and run the personality model.
    Returns prediction dict with best class, confidence, and top-3 list.
    """
    try:
        image_bytes = await file.read()
        result = predict(image_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
