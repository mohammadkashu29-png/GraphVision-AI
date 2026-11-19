import io
import json
import os
from pathlib import Path
import numpy as np
import tensorflow as tf
from PIL import Image

# Determine the backend directory and models directory
BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = BACKEND_DIR / "models" / "handwriting_personality_resnet50.keras"
DEFAULT_CLASS_NAMES_PATH = BACKEND_DIR / "models" / "class_names.json"

MODEL_PATH = Path(os.getenv("PERSONALITY_MODEL_PATH", str(DEFAULT_MODEL_PATH)))
CLASS_NAMES_PATH = Path(os.getenv("PERSONALITY_CLASS_NAMES_PATH", str(DEFAULT_CLASS_NAMES_PATH)))

# Load the Keras model once at import time
if not MODEL_PATH.is_file():
    raise FileNotFoundError(f"Personality model not found at {MODEL_PATH}")
model = tf.keras.models.load_model(str(MODEL_PATH))

# Load class names if available
if CLASS_NAMES_PATH.is_file():
    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
        CLASS_NAMES = json.load(f)
else:
    CLASS_NAMES = ["Extrovert", "Introvert", "Optimistic", "Pessimistic", "Stable_Mindset"]

IMAGE_SIZE = (224, 224)

def _prepare_image(image_bytes: bytes) -> np.ndarray:
    """Resize and normalize an image for the ResNet50 personality model."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize(IMAGE_SIZE)
    arr = np.asarray(image, dtype=np.float32)
    arr = np.expand_dims(arr, axis=0)
    return arr

def predict(image_bytes: bytes) -> dict:
    """Run the personality prediction on raw image bytes.
    Returns a dictionary with the top-3 classes and their probabilities, plus the best prediction.
    """
    img = _prepare_image(image_bytes)
    probabilities = model.predict(img, verbose=0)[0]
    order = np.argsort(probabilities)[::-1]
    top3 = [{"class": CLASS_NAMES[i], "probability": float(probabilities[i])} for i in order[:3]]
    best_idx = int(order[0])
    return {
        "prediction": CLASS_NAMES[best_idx],
        "confidence": float(probabilities[best_idx]),
        "top3": top3,
    }
