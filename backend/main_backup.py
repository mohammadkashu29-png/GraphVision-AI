import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func

from config import CORS_ORIGINS, UPLOAD_DIR
from database import HandwritingAnalysis, SessionLocal, SignatureVerification
from routers import handwriting, history, htr, model, signature

app = FastAPI(
    title="GraphVision AI API",
    version="1.0.0",
    description="Handwriting preprocessing, TrOCR handwritten text recognition, and Siamese CNN signature verification backend."
)

app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
app.mount("/media", StaticFiles(directory=UPLOAD_DIR), name="media")

app.include_router(handwriting.router, prefix="/api/handwriting", tags=["handwriting"])
app.include_router(htr.router, prefix="/api/htr", tags=["handwritten-text-recognition"])
app.include_router(signature.router, prefix="/api/signature", tags=["signature"])
app.include_router(model.router, prefix="/api/model", tags=["model"])
app.include_router(history.router, prefix="/api/history", tags=["history"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/stats")
def stats():
    """Dashboard statistics — always derived from real application activity (starts at zero)."""
    db = SessionLocal()
    try:
        hw = db.query(func.count(HandwritingAnalysis.id)).scalar() or 0
        sv = db.query(func.count(SignatureVerification.id)).scalar() or 0
        genuine = (db.query(func.count(SignatureVerification.id))
                   .filter(SignatureVerification.predicted_same == True).scalar() or 0)  # noqa: E712
        recent = []
        for r in (db.query(HandwritingAnalysis)
                  .order_by(HandwritingAnalysis.created_at.desc()).limit(5).all()):
            recent.append({"type": "handwriting", "id": r.id, "title": r.filename,
                           "subtitle": f"{r.width}×{r.height} px · {r.processing_time_ms:.0f} ms",
                           "created_at": r.created_at.isoformat(),
                           "thumbnail": f"/media/{r.original_image}"})
        for r in (db.query(SignatureVerification)
                  .order_by(SignatureVerification.created_at.desc()).limit(5).all()):
            verdict = "Predicted Same / Genuine Pair" if r.predicted_same else "Predicted Different / Potential Forgery"
            stored_a = json.loads(r.result_json or "{}").get("image_a", r.filename_a)
            recent.append({"type": "signature", "id": r.id,
                           "title": f"{r.filename_a} vs {r.filename_b}",
                           "subtitle": f"{verdict} · d={r.distance:.4f}",
                           "created_at": r.created_at.isoformat(),
                           "thumbnail": f"/media/{stored_a}"})
        recent.sort(key=lambda x: x["created_at"], reverse=True)
        return {"handwriting_analyses": hw, "signature_comparisons": sv,
                "genuine_detected": genuine, "forged_detected": sv - genuine,
                "recent": recent[:6]}
    finally:
        db.close()
