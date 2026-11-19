import json
import os
import uuid
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from config import ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE_MB, UPLOAD_DIR
from database import HandwritingAnalysis, get_db
from services.handwriting_pipeline import PipelineError, analyze_handwriting
from services.reports import handwriting_csv_bytes, handwriting_pdf_bytes

router = APIRouter()


def _validate(file: UploadFile):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: PNG, JPG, JPEG.")


def _save_png_from_array(img: np.ndarray, name: str):
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise HTTPException(500, "Failed to store image.")
    with open(os.path.join(UPLOAD_DIR, name), "wb") as f:
        f.write(buf.tobytes())


@router.post("/analyze")
async def analyze(file: UploadFile = File(...),
                  min_component_area: Optional[int] = None,
                  db: Session = Depends(get_db)):
    _validate(file)
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File exceeds the {MAX_UPLOAD_SIZE_MB} MB limit.")

    try:
        payload, processed = analyze_handwriting(contents, min_component_area=min_component_area)
    except PipelineError as e:
        raise HTTPException(400, str(e))

    payload["filename"] = file.filename or "upload"
    orig_name = f"hw_{uuid.uuid4().hex}.png"
    proc_name = f"hw_{uuid.uuid4().hex}.png"
    _save_png_from_array(cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR), orig_name)
    _save_png_from_array(processed, proc_name)

    stored = {k: v for k, v in payload.items() if k != "stages"}  # stage base64 kept only in live response
    stored["original_image_url"] = f"/media/{orig_name}"
    stored["processed_image_url"] = f"/media/{proc_name}"

    row = HandwritingAnalysis(
        filename=payload["filename"], original_image=orig_name, processed_image=proc_name,
        width=payload["width"], height=payload["height"],
        processing_time_ms=payload["processing_time_ms"],
        result_json=json.dumps(stored),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    payload["analysis_id"] = row.id
    payload["created_at"] = row.created_at.isoformat()
    payload["original_image_url"] = f"/media/{orig_name}"
    payload["processed_image_url"] = f"/media/{proc_name}"
    return payload


@router.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    row = db.get(HandwritingAnalysis, analysis_id)
    if not row:
        raise HTTPException(404, "Analysis not found.")
    data = json.loads(row.result_json)
    data.update({"analysis_id": row.id, "created_at": row.created_at.isoformat(),
                 "filename": row.filename, "width": row.width, "height": row.height,
                 "processing_time_ms": row.processing_time_ms})
    return data


@router.get("/features-history")
def features_history(limit: int = 20, db: Session = Depends(get_db)):
    rows = (db.query(HandwritingAnalysis)
              .order_by(HandwritingAnalysis.created_at.desc()).limit(limit).all())
    samples = [{"id": r.id, "created_at": r.created_at.isoformat(),
                "features": json.loads(r.result_json)["features"]} for r in reversed(rows)]
    return {"samples": samples}


@router.get("/analyses/{analysis_id}/csv")
def download_csv(analysis_id: int, db: Session = Depends(get_db)):
    row = db.get(HandwritingAnalysis, analysis_id)
    if not row:
        raise HTTPException(404, "Analysis not found.")
    content = handwriting_csv_bytes(json.loads(row.result_json))
    return Response(content, media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="graphvision_handwriting_{analysis_id}.csv"'})


@router.get("/analyses/{analysis_id}/pdf")
def download_pdf(analysis_id: int, db: Session = Depends(get_db)):
    row = db.get(HandwritingAnalysis, analysis_id)
    if not row:
        raise HTTPException(404, "Analysis not found.")
    content = handwriting_pdf_bytes(json.loads(row.result_json), row.id,
                                    row.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"))
    return Response(content, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="graphvision_handwriting_{analysis_id}.pdf"'})
