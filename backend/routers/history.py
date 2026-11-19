import json
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from config import UPLOAD_DIR
from database import HandwritingAnalysis, SignatureVerification, get_db

router = APIRouter()


def _stored_names(row: SignatureVerification):
    extra = json.loads(row.result_json or "{}")
    return extra.get("image_a", row.filename_a), extra.get("image_b", row.filename_b), extra


@router.get("")
def list_history(type: str = None, limit: int = 50, db: Session = Depends(get_db)):
    items = []
    if type in (None, "", "handwriting"):
        for r in (db.query(HandwritingAnalysis)
                  .order_by(desc(HandwritingAnalysis.created_at)).limit(limit).all()):
            f = json.loads(r.result_json).get("features", {})
            items.append({
                "type": "handwriting", "id": r.id, "created_at": r.created_at.isoformat(),
                "title": r.filename, "thumbnail": f"/media/{r.original_image}",
                "summary": {"ink_density": f.get("ink_density"),
                            "word_spaces": f.get("word_spaces"),
                            "handwriting_lines": f.get("handwriting_lines"),
                            "processing_time_ms": r.processing_time_ms},
            })
    if type in (None, "", "signature"):
        for r in (db.query(SignatureVerification)
                  .order_by(desc(SignatureVerification.created_at)).limit(limit).all()):
            stored_a, _, _ = _stored_names(r)
            items.append({
                "type": "signature", "id": r.id, "created_at": r.created_at.isoformat(),
                "title": f'{r.filename_a}  vs  {r.filename_b}',
                "thumbnail": f"/media/{stored_a}",
                "summary": {"predicted_same": r.predicted_same,
                            "distance": round(r.distance, 4), "threshold": round(r.threshold, 4),
                            "processing_time_ms": r.processing_time_ms},
            })
    items.sort(key=lambda x: x["created_at"], reverse=True)
    return {"items": items[:limit]}


@router.get("/handwriting/{analysis_id}")
def handwriting_detail(analysis_id: int, db: Session = Depends(get_db)):
    row = db.get(HandwritingAnalysis, analysis_id)
    if not row:
        raise HTTPException(404, "Analysis not found.")
    data = json.loads(row.result_json)
    data.update({"type": "handwriting", "id": row.id, "created_at": row.created_at.isoformat(),
                 "filename": row.filename, "width": row.width, "height": row.height,
                 "processing_time_ms": row.processing_time_ms,
                 "csv_url": f"/api/handwriting/analyses/{row.id}/csv",
                 "pdf_url": f"/api/handwriting/analyses/{row.id}/pdf"})
    return data


@router.get("/signature/{verification_id}")
def signature_detail(verification_id: int, db: Session = Depends(get_db)):
    row = db.get(SignatureVerification, verification_id)
    if not row:
        raise HTTPException(404, "Verification not found.")
    stored_a, stored_b, extra = _stored_names(row)
    return {
        "type": "signature", "id": row.id, "created_at": row.created_at.isoformat(),
        "filename_a": row.filename_a, "filename_b": row.filename_b,
        "image_a_url": f"/media/{stored_a}", "image_b_url": f"/media/{stored_b}",
        "predicted_same": row.predicted_same,
        "label": "Predicted Same / Genuine Pair" if row.predicted_same else "Predicted Different / Potential Forgery",
        "distance": row.distance, "threshold": row.threshold,
        "embedding_dim": extra.get("embedding_dim"),
        "processing_time_ms": row.processing_time_ms,
    }


@router.delete("/handwriting/{analysis_id}")
def delete_handwriting(analysis_id: int, db: Session = Depends(get_db)):
    row = db.get(HandwritingAnalysis, analysis_id)
    if not row:
        raise HTTPException(404, "Analysis not found.")
    for name in (row.original_image, row.processed_image):
        p = os.path.join(UPLOAD_DIR, name)
        if os.path.exists(p):
            os.remove(p)
    db.delete(row)
    db.commit()
    return {"deleted": True}


@router.delete("/signature/{verification_id}")
def delete_signature(verification_id: int, db: Session = Depends(get_db)):
    row = db.get(SignatureVerification, verification_id)
    if not row:
        raise HTTPException(404, "Verification not found.")
    stored_a, stored_b, _ = _stored_names(row)
    for name in (stored_a, stored_b):
        p = os.path.join(UPLOAD_DIR, name)
        if os.path.exists(p):
            os.remove(p)
    db.delete(row)
    db.commit()
    return {"deleted": True}
