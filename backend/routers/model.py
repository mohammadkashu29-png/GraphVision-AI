import json
import os

from fastapi import APIRouter

from config import EVAL_RESULTS_PATH
from services.signature_service import SignatureModelService

router = APIRouter()


@router.get("/status")
def model_status():
    return SignatureModelService.get().status()


@router.get("/evaluation")
def model_evaluation():
    """Returns only ACTUAL saved evaluation results produced by the training script.
    Nothing is hardcoded or fabricated here."""
    if os.path.exists(EVAL_RESULTS_PATH):
        with open(EVAL_RESULTS_PATH) as f:
            return {"available": True, "evaluation": json.load(f)}
    return {"available": False,
            "message": "No saved evaluation results found. Run training/train_siamese.py to train the "
                       "Siamese CNN on CEDAR and generate eval_results.json."}
