from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from backend.services.preprocessing import ImagePreprocessor
from backend.models.signature_model import SignatureVerificationModelWrapper
from backend.schemas.responses import SignatureVerificationResponse

router = APIRouter(prefix="/api/signature", tags=["Signature Verification"])
signature_model = SignatureVerificationModelWrapper()

@router.post("/verify", response_model=SignatureVerificationResponse)
async def verify_signature(
    signature1: UploadFile = File(..., description="Reference signature image"),
    signature2: UploadFile = File(..., description="Questioned signature image"),
    demo_mode: Optional[bool] = Form(False, description="Enable simulated demo mode if weights are pending")
):
    if not signature1.content_type.startswith("image/") or not signature2.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Both uploaded files must be valid images.")

    bytes1 = await signature1.read()
    bytes2 = await signature2.read()

    if len(bytes1) == 0 or len(bytes2) == 0:
        raise HTTPException(status_code=400, detail="One or both signature images are empty.")

    try:
        # Preprocess both signatures
        prep1 = ImagePreprocessor.preprocess_pipeline(bytes1)
        prep2 = ImagePreprocessor.preprocess_pipeline(bytes2)

        # Siamese Network Verification
        result = signature_model.verify_signatures(
            sig1_img=prep1["pil_image"],
            sig2_img=prep2["pil_image"],
            sig1_preprocessed=prep1,
            sig2_preprocessed=prep2,
            demo_mode=demo_mode
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Signature verification error: {str(e)}")
