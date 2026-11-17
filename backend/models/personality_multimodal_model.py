import os
import json
import logging
import numpy as np
import torch
from torch import nn

logger = logging.getLogger("personality_multimodal")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [PersonalityMultimodal] %(message)s")
    ch.setFormatter(formatter)
    logger.addHandler(ch)

class PersonalityMultimodalModel(nn.Module):
    """Two-branch network: visual ResNet-50 (2048-dim) + structural numeric vector (9-dim)
    -> fusion layers -> 5 Big-Five trait scores in [0, 1].

    Loads an optional checkpoint (e.g. untrained baseline shipped in personality_assets/).
    A successfully loaded checkpoint does NOT automatically mark the model as trained.
    Untrained checkpoints emit `is_trained = False` and `model_connected = False`
    unless verified and genuinely trained.
    """

    def __init__(self):
        super().__init__()
        # Resolve project root: personality_multimodal_model.py is in backend/models/
        self.project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        self.assets_dir = os.path.join(self.project_root, "personality_assets")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # 1. Resolve asset paths
        default_ckpt = os.path.join(self.assets_dir, "personality_model_untrained.pth")
        self.checkpoint_path = os.getenv("PERSONA_MULTIMODAL_MODEL_PATH", default_ckpt)
        self.config_path = os.path.join(self.assets_dir, "config.json")
        self.struct_path = os.path.join(self.assets_dir, "structural_features.npy")

        # 2. Determine structural feature dimension dynamically from assets / metadata
        self.struct_dim = self._resolve_struct_dim()

        # 3. Build two-branch architecture exactly matching the checkpoint
        visual_dim = 2048  # ResNet-50 penultimate layer output size
        visual_hidden = 512
        struct_hidden = 32

        self.visual_branch = nn.Sequential(
            nn.Linear(visual_dim, visual_hidden),
            nn.ReLU(inplace=True)
        )
        self.structural_branch = nn.Sequential(
            nn.Linear(self.struct_dim, struct_hidden),
            nn.ReLU(inplace=True)
        )
        self.fusion = nn.Sequential(
            nn.Linear(visual_hidden + struct_hidden, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, 5),
            nn.Sigmoid()
        )
        self.to(self.device)

        # 4. Trained status and checkpoint loading
        self.is_trained = False
        self._load_checkpoint()

    def _resolve_struct_dim(self) -> int:
        """Resolve structural feature dimension from structural_features.npy or config.json.
        Does not assume hardcoded dimensions without inspection.
        """
        if os.path.isfile(self.struct_path):
            try:
                sample_struct = np.load(self.struct_path)
                dim = int(sample_struct.shape[-1])
                logger.info(f"Resolved structural feature dimension from {self.struct_path}: {dim}")
                return dim
            except Exception as e:
                logger.warning(f"Could not load structural features asset at {self.struct_path}: {e}")

        if os.path.isfile(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                dim = int(cfg.get("structural_dimensions", 9))
                logger.info(f"Resolved structural feature dimension from {self.config_path}: {dim}")
                return dim
            except Exception as e:
                logger.warning(f"Could not read config at {self.config_path}: {e}")

        logger.warning(f"Structural feature assets missing in {self.assets_dir}; default fallback dimension is 9.")
        return 9

    def _load_checkpoint(self):
        """Loads weights from checkpoint without confusing presence with trained/validated status."""
        if not os.path.isfile(self.checkpoint_path):
            self.is_trained = False
            logger.warning(
                f"Personality multimodal checkpoint not found at {self.checkpoint_path}. "
                "Model remains UNTRAINED and not connected."
            )
            return

        try:
            ckpt = torch.load(self.checkpoint_path, map_location=self.device)
            state_dict = ckpt.get("state_dict", ckpt) if isinstance(ckpt, dict) else ckpt
            self.load_state_dict(state_dict)

            # Check metadata / config to determine whether this checkpoint is genuinely trained
            is_trained_flag = False
            if isinstance(ckpt, dict):
                is_trained_flag = bool(ckpt.get("is_trained", False))

            if os.path.isfile(self.config_path):
                try:
                    with open(self.config_path, "r", encoding="utf-8") as f:
                        cfg = json.load(f)
                    model_status = str(cfg.get("model_status", "")).upper()
                    prediction_status = str(cfg.get("prediction_status", "")).upper()
                    if model_status == "UNTRAINED" or "NOT_VALIDATED" in prediction_status:
                        is_trained_flag = False
                except Exception as e:
                    logger.debug(f"Could not parse config.json for trained status: {e}")

            if "untrained" in os.path.basename(self.checkpoint_path).lower():
                is_trained_flag = False

            self.is_trained = is_trained_flag
            if not self.is_trained:
                logger.warning(
                    f"Loaded baseline checkpoint from {self.checkpoint_path}. "
                    "Checkpoint is UNTRAINED / NOT_VALIDATED. Output predictions are uncalibrated baselines."
                )
            else:
                logger.info(f"Loaded validated trained personality multimodal checkpoint from {self.checkpoint_path}.")

        except Exception as e:
            self.is_trained = False
            logger.error(f"Failed to load personality multimodal checkpoint from {self.checkpoint_path}: {e}")

    def forward(self, visual_feat: torch.Tensor, struct_feat: torch.Tensor) -> torch.Tensor:
        v_out = self.visual_branch(visual_feat.to(self.device))
        s_out = self.structural_branch(struct_feat.to(self.device))
        fused = torch.cat([v_out, s_out], dim=-1)
        return self.fusion(fused)

    def predict(self, visual_feat: torch.Tensor, struct_feat: torch.Tensor) -> dict:
        """Return a dict with `trait_scores` (list of five floats) and `model_connected` flag."""
        self.eval()
        with torch.no_grad():
            if visual_feat.dim() == 1:
                visual_feat = visual_feat.unsqueeze(0)
            if struct_feat.dim() == 1:
                struct_feat = struct_feat.unsqueeze(0)
            scores = self.forward(visual_feat, struct_feat).squeeze(0).cpu().tolist()
        return {"trait_scores": scores, "model_connected": self.is_trained}
