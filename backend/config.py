import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
CHECKPOINT_DIR = os.path.join(BASE_DIR, "checkpoints")
DB_PATH = os.path.join(DATA_DIR, "graphvision.db")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHECKPOINT_DIR, exist_ok=True)

MAX_UPLOAD_SIZE_MB = 10
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}

CHECKPOINT_PATH = (
    os.path.join(CHECKPOINT_DIR, "best_siamese_model.pth")
    if os.path.exists(os.path.join(CHECKPOINT_DIR, "best_siamese_model.pth"))
    else os.path.join(CHECKPOINT_DIR, "siamese_best.pt")
)
MODEL_CONFIG_PATH = os.path.join(CHECKPOINT_DIR, "model_config.json")
EVAL_RESULTS_PATH = os.path.join(CHECKPOINT_DIR, "eval_results.json")

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
