import os
import pathlib
import logging
import traceback
from fastapi import APIRouter, File, HTTPException, UploadFile
from config import ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE_MB

router = APIRouter()

def _load_env():
    """Load Qwen endpoint and HF token from .env at project root.
    Returns a tuple (qwen_url, hf_token). Raises HTTPException if dotenv is missing.
    """
    try:
        from dotenv import load_dotenv
    except ImportError:
        raise HTTPException(status_code=503, detail='python-dotenv not installed')
    # Project root is two levels up from this file (backend/routers/htr.py -> backend -> project)
    root_dir = pathlib.Path(__file__).resolve().parents[2]
    load_dotenv(dotenv_path=root_dir / '.env')
    return os.getenv('QWEN_API_URL'), os.getenv('HF_TOKEN')

@router.get("/status")
def status():
    return {"available": True, "model_id": "Qwen/Qwen2.5-VL-3B-Instruct", "device": "cuda (ZeroGPU)"}

@router.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Unsupported file type. Upload PNG, JPG, or JPEG.")
    contents = await file.read()
    if not contents:
        raise HTTPException(400, "The uploaded image is empty.")
    if len(contents) > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File exceeds the {MAX_UPLOAD_SIZE_MB} MB limit.")

    qwen_url, hf_token = _load_env()
    if not qwen_url:
        raise HTTPException(status_code=503, detail="QWEN_API_URL not configured")

    try:
        from gradio_client import Client, handle_file
        import tempfile
        logger = logging.getLogger('uvicorn.error')
        # Save to a temporary file for Gradio client
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        client = Client(qwen_url.replace("/htr", ""), token=hf_token)
        pred_text = client.predict(image=handle_file(tmp_path), api_name="/predict_handwriting")
        # Cleanup temporary file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        if pred_text:
            return {
                "status": "success",
                "text": str(pred_text),
                "filename": file.filename or "upload",
                "fallback": False,
                "model_id": "Qwen/Qwen2.5-VL-3B-Instruct",
                "device": "cuda (ZeroGPU)"
            }
    except Exception as e:
        logger = logging.getLogger('uvicorn.error')
        logger.error(f"Qwen Gradio API call failed: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=503, detail=f"Qwen endpoint error: {e}")
