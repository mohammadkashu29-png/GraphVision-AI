import os
import torch
from torchvision import models, transforms
from PIL import Image
import logging

logger = logging.getLogger("personality_visual")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [PersonalityVisual] %(message)s")
    ch.setFormatter(formatter)
    logger.addHandler(ch)

class VisualFeatureExtractor:
    """Extracts visual features from handwriting images using a pretrained ResNet-50.
    The model is loaded once at startup. If a fine‑tuned checkpoint is provided via the
    PERSONA_VISUAL_MODEL_PATH environment variable, it will be loaded; otherwise the
    ImageNet‑pretrained weights are used for feature extraction only.
    """

    def __init__(self):
        self.model_path = os.getenv("PERSONA_VISUAL_MODEL_PATH")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        # Load base ResNet-50
        self.base_model = models.resnet50(pretrained=True)
        # Remove final classification head – we keep the penultimate 2048‑dim vector
        self.base_model.fc = torch.nn.Identity()
        self.base_model.to(self.device)
        self.base_model.eval()
        if self.model_path:
            try:
                checkpoint = torch.load(self.model_path, map_location=self.device)
                self.base_model.load_state_dict(checkpoint)
                logger.info(f"Loaded fine‑tuned ResNet‑50 visual model from {self.model_path}")
            except Exception as e:
                logger.error(f"Failed to load visual checkpoint {self.model_path}: {e}")
        else:
            logger.info("Using ImageNet pretrained ResNet‑50 for visual feature extraction (no fine‑tuning).")
        # Normalisation used for ImageNet models
        self.preprocess = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def extract(self, pil_img: Image.Image) -> torch.Tensor:
        """Return a 2048‑dim feature tensor on the configured device."""
        try:
            tensor = self.preprocess(pil_img).unsqueeze(0).to(self.device)
            with torch.no_grad():
                feats = self.base_model(tensor)
            return feats.squeeze(0).cpu()
        except Exception as e:
            logger.error(f"Visual feature extraction failed: {e}")
            raise
