import json
import os
import uuid

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from config import ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE_MB, UPLOAD_DIR
from database import SignatureVerification, get_db
from services.signature_service import SignatureModelService

router = APIRouter()

DISCLAIMER = ("Automated similarity prediction is not definitive proof of authenticity. This system reports a "
              "model-based similarity decision only and must not be used as the sole basis for legal or forensic conclusions.")


def _validate(file: UploadFile):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: PNG, JPG, JPEG.")


def _save_png(data: bytes, name: str):
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, f"Could not decode image '{name}'.")
    ok, buf = cv2.imencode(".png", img)
    with open(os.path.join(UPLOAD_DIR, name), "wb") as f:
        f.write(buf.tobytes())


@router.post("/verify")
async def verify(signature_a: UploadFile = File(...),
                 signature_b: UploadFile = File(...),
                 db: Session = Depends(get_db)):
    for f in (signature_a, signature_b):
        _validate(f)
    a_bytes = await signature_a.read()
    b_bytes = await signature_b.read()
    for name, data in (("Signature A", a_bytes), ("Signature B", b_bytes)):
        if len(data) > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(400, f"{name} exceeds the {MAX_UPLOAD_SIZE_MB} MB limit.")

    service = SignatureModelService.get()
    if not service.loaded:
        raise HTTPException(503, detail={
            "message": "The Siamese CNN model is not loaded — no trained checkpoint is present. "
                       "The application does not simulate verification without real model weights.",
            "status": service.status(),
        })

    try:
        res = service.verify(a_bytes, b_bytes)
    except ValueError as e:
        raise HTTPException(400, str(e))

    name_a = f"sig_{uuid.uuid4().hex}_a.png"
    name_b = f"sig_{uuid.uuid4().hex}_b.png"
    _save_png(a_bytes, name_a)
    _save_png(b_bytes, name_b)

    row = SignatureVerification(
        filename_a=signature_a.filename or "signature_a",
        filename_b=signature_b.filename or "signature_b",
        distance=res["distance"], threshold=res["threshold"],
        predicted_same=res["predicted_same"],
        processing_time_ms=res["processing_time_ms"],
        result_json=json.dumps({"embedding_dim": res["embedding_dim"],
                                "image_a": name_a, "image_b": name_b}),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "verification_id": row.id,
        "created_at": row.created_at.isoformat(),
        "result": "genuine_pair" if res["predicted_same"] else "different_pair",
        "label": "Predicted Same / Genuine Pair" if res["predicted_same"] else "Predicted Different / Potential Forgery",
        "distance": round(res["distance"], 6),
        "threshold": round(res["threshold"], 6),
        "predicted_same": res["predicted_same"],
        "embedding_dim": res["embedding_dim"],
        "processing_time_ms": round(res["processing_time_ms"], 2),
        "image_a_url": f"/media/{name_a}",
        "image_b_url": f"/media/{name_b}",
        "disclaimer": DISCLAIMER,
    }
