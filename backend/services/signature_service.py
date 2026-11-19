import json
import os
import time
from pathlib import Path

import cv2
import numpy as np
import torch
from torch import nn

# ---------------------------------------------------------------------------
# Model definition – exactly as in the original Colab notebook (cells 26, 60)
# ---------------------------------------------------------------------------

class SignatureEncoder(nn.Module):
    """Exact encoder from original notebook.
    Conv(1, 32) → ReLU → MaxPool(2)
    Conv(32, 64) → ReLU → MaxPool(2)
    Conv(64, 128) → ReLU → MaxPool(2)
    Flatten → Linear(128 * 28 * 28, 256) → ReLU → Linear(256, 128)
    Input: (1, 224, 224) grayscale image.
    """

    def __init__(self, embedding_dim: int = 128) -> None:
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 28 * 28, 256),
            nn.ReLU(),
            nn.Linear(256, embedding_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.cnn(x)
        x = self.fc(x)
        return x


class SiameseNetwork(nn.Module):
    """Siamese network that shares the SignatureEncoder weights."""

    def __init__(self, embedding_dim: int = 128) -> None:
        super().__init__()
        self.encoder = SignatureEncoder(embedding_dim=embedding_dim)

    def embed(self, x: torch.Tensor) -> torch.Tensor:
        return self.encoder(x)

    def forward(self, img1: torch.Tensor, img2: torch.Tensor):
        return self.embed(img1), self.embed(img2)


class ContrastiveLoss(nn.Module):
    """Contrastive loss with margin 1.0 (original notebook cell 30)."""

    def __init__(self, margin: float = 1.0) -> None:
        super().__init__()
        self.margin = margin

    def forward(self, emb1: torch.Tensor, emb2: torch.Tensor, label: torch.Tensor) -> torch.Tensor:
        distance = torch.nn.functional.pairwise_distance(emb1, emb2)
        loss = label * torch.pow(distance, 2) + (1 - label) * torch.pow(
            torch.clamp(self.margin - distance, min=0.0), 2
        )
        return loss.mean()


# ---------------------------------------------------------------------------
# Helper to locate the checkpoint – the requirement is to use a models folder
# ---------------------------------------------------------------------------

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "siamese_cedar_best.pth"
CONFIG_PATH = Path(__file__).resolve().parent.parent / "checkpoints" / "model_config.json"


class SignatureModelService:
    """Singleton service that loads the Siamese checkpoint + config.
    It is instantiated lazily via ``SignatureModelService.get()``.
    """

    _instance = None

    @classmethod
    def get(cls) -> "SignatureModelService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: nn.Module | None = None
        self.config: dict | None = None
        self.error: str | None = None
        self.checkpoint_file: str | None = None
        self.load()

    # ---------------------------------------------------------------------
    # Loading logic – reads CONFIG_PATH and the checkpoint at MODEL_PATH
    # ---------------------------------------------------------------------
    def load(self) -> None:
        self.model = None
        self.config = None
        self.error = None

        # Load configuration (contains normalization, threshold etc.)
        if not CONFIG_PATH.is_file():
            self.error = f"model_config.json not found at {CONFIG_PATH}"
            return
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                self.config = json.load(f)
        except Exception as exc:
            self.error = f"Failed to read model_config.json: {exc}"
            return

        # Verify checkpoint existence
        if not MODEL_PATH.is_file():
            self.error = f"Checkpoint not found at {MODEL_PATH}"
            return
        self.checkpoint_file = str(MODEL_PATH)

        try:
            # Load raw checkpoint – may be dict with model_state_dict / state_dict or raw state dict
            checkpoint = torch.load(str(MODEL_PATH), map_location=self.device)
            if isinstance(checkpoint, dict):
                state_dict = checkpoint.get("model_state_dict") or checkpoint.get("state_dict") or checkpoint
            else:
                state_dict = checkpoint

            # -----------------------------------------------------------------
            # Map keys to match the SiameseNetwork hierarchy (encoder.cnn.*, encoder.fc.*)
            # -----------------------------------------------------------------
            def _map_state_dict_keys(state_dict: dict) -> dict:
                # If already correctly prefixed, return unchanged
                if any(k.startswith("encoder.cnn.") or k.startswith("encoder.fc.") for k in state_dict):
                    return state_dict
                mapped = {}
                for k, v in state_dict.items():
                    if k.startswith("encoder."):
                        rest = k[len("encoder."):]
                        if rest.startswith(("0.", "3.", "6.")):
                            mapped[f"encoder.cnn.{rest}"] = v
                        elif rest.startswith(("1.", "3.")):
                            mapped[f"encoder.fc.{rest}"] = v
                        else:
                            mapped[k] = v
                    elif k.startswith(("0.", "3.", "6.")) and k.endswith((".weight", ".bias")):
                        mapped[f"encoder.cnn.{k}"] = v
                    elif k.startswith("cnn."):
                        mapped[f"encoder.{k}"] = v
                    elif k.startswith("fc."):
                        mapped[f"encoder.{k}"] = v
                    else:
                        mapped[k] = v
                return mapped

            mapped_state_dict = _map_state_dict_keys(state_dict)

            embedding_dim = int(self.config.get("embedding_dim", 128))
            model = SiameseNetwork(embedding_dim=embedding_dim)
            model.load_state_dict(mapped_state_dict)
            model.to(self.device).eval()
            self.model = model
        except Exception as exc:
            self.error = f"Failed to load checkpoint: {exc}"

    # ---------------------------------------------------------------------
    @property
    def loaded(self) -> bool:
        return self.model is not None and self.config is not None

    # ---------------------------------------------------------------------
    def preprocess(self, data: bytes) -> torch.Tensor:
        """Preprocess a raw image (bytes) to the tensor expected by the model.
        Steps: decode → grayscale → resize → to‑tensor → normalize(mean=0.5, std=0.5).
        """
        img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError("Could not decode signature image.")
        cfg = self.config or {"img_width": 224, "img_height": 224}
        w, h = cfg.get("img_width", 224), cfg.get("img_height", 224)
        img = cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
        # Convert to float tensor in [0,1]
        x = img.astype(np.float32) / 255.0
        norm = cfg.get("normalization", {"mean": 0.5, "std": 0.5})
        mean = float(norm.get("mean", 0.5))
        std = float(norm.get("std", 0.5)) or 0.5
        x = (x - mean) / std
        # Add channel and batch dimensions → (1, 1, H, W)
        return torch.from_numpy(x).unsqueeze(0).unsqueeze(0)

    # ---------------------------------------------------------------------
    def verify(self, a: bytes, b: bytes) -> dict:
        if not self.loaded:
            raise RuntimeError("Siamese model is not loaded.")
        t0 = time.perf_counter()
        with torch.no_grad():
            ea = self.model.embed(self.preprocess(a).to(self.device))
            eb = self.model.embed(self.preprocess(b).to(self.device))
            distance = float(torch.norm(ea - eb, p=2).item())
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        threshold = float(self.config.get("decision_threshold", 0.36107573))
        return {
            "distance": distance,
            "threshold": threshold,
            "predicted_same": distance < threshold,
            "embedding_dim": int(self.config.get("embedding_dim", 128)),
            "processing_time_ms": elapsed_ms,
        }

    # ---------------------------------------------------------------------
    def status(self) -> dict:
        cfg = None
        if self.config:
            cfg = {k: self.config.get(k) for k in (
                "img_height", "img_width", "embedding_dim", "contrastive_margin",
                "decision_threshold", "threshold_selection", "normalization", "dataset", "pipeline",
            )}
        return {
            "model_loaded": self.loaded,
            "checkpoint_found": bool(self.checkpoint_file),
            "checkpoint_path": self.checkpoint_file,
            "config_found": CONFIG_PATH.is_file(),
            "device": "cuda" if self.device.type == "cuda" else "cpu",
            "config": cfg,
            "error": self.error,
            "setup_instructions": [
                "Place the trained Siamese checkpoint (siamese_cedar_best.pth) under backend/models/.",
                "Ensure model_config.json exists under backend/checkpoints/.",
                "The model expects 224x224 grayscale input normalized with mean=0.5, std=0.5.",
            ],
        }
