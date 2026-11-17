from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# --- HTR Schemas ---
class HTRLine(BaseModel):
    line_number: int
    text: str
    bounding_box: Optional[List[int]] = None  # [ymin, xmin, ymax, xmax]
    confidence: Optional[float] = Field(default=None, description="Recognition confidence 0-1")
    line_image_data: Optional[str] = Field(default=None, description="Base64 encoded line crop")
    ocr_source: Optional[str] = Field(
        default=None,
        description="Which OCR engine produced this line: 'openai_vision', 'trocr', or 'none'"
    )

class HTRResponse(BaseModel):
    transcription: str
    lines: List[HTRLine]
    num_lines: int
    model_name: str = "TrOCR (Transformer-based Optical Character Recognition)"
    active_engine: Optional[str] = Field(
        default=None,
        description="Description of which OCR engine(s) were used for this request"
    )
    benchmark_cer: float = 4.82
    benchmark_wer: float = 11.75
    test_samples: int = 2915
    dataset: str = "IAM Handwriting Database"
    is_demo: bool = False
    preprocessing_info: Optional[Dict[str, Any]] = None

# --- Writer Identification Schemas ---
class WriterPrediction(BaseModel):
    writer_id: str
    confidence: float

class WriterIdentificationResponse(BaseModel):
    writer_id: str
    confidence: float
    top_predictions: List[WriterPrediction]
    model_connected: bool
    status: str = "success"
    message: Optional[str] = None
    is_demo: bool = False
    extracted_features_summary: Optional[Dict[str, Any]] = None

# --- Signature Verification Schemas ---
class SignatureVerificationResponse(BaseModel):
    result: str  # "genuine" or "forged" or "model_not_connected"
    distance: float
    threshold: float
    similarity: float
    model_connected: bool
    status: str = "success"
    message: Optional[str] = None
    dataset: str = "CEDAR Signature Dataset"
    model_architecture: str = "Siamese Neural Network (ResNet/CNN Backbone)"
    is_demo: bool = False

# --- Personality Analysis Schemas ---
class PersonalityTrait(BaseModel):
    trait: str
    score: float
    interpretation: Optional[str] = None
    derived_from: Optional[str] = None

class PersonalityFeatures(BaseModel):
    slant: str
    letter_size: str
    spacing: str
    baseline: str
    consistency: str
    slant_degrees: Optional[float] = None
    line_spacing_ratio: Optional[float] = None
    stroke_thickness_proxy: Optional[float] = None
    baseline_angle_variance: Optional[float] = None

class PersonalityResponse(BaseModel):
    features: Dict[str, Any]
    experimental_associations: List[PersonalityTrait]
    trait_scores: List[PersonalityTrait] = Field(default_factory=list, description="List of five Big Five trait scores (0-1 range)")
    model_connected: bool = Field(default=False, description="True when a trained multimodal checkpoint is loaded")
    disclaimer: str = (
        "This module provides experimental associations based on handwriting characteristics "
        "and graphology-inspired rules. These results are not scientifically validated psychological "
        "or personality assessments and should not be treated as a diagnosis, psychological "
        "evaluation, or factual determination of personality."
    )
    raw_metrics: Optional[Dict[str, Any]] = None
    is_demo: bool = False

# --- System Health & Benchmark Schemas ---
class ModuleStatus(BaseModel):
    name: str
    connected: bool
    details: str
    dataset: str
    metrics: Dict[str, Any]

class SystemHealthResponse(BaseModel):
    status: str
    modules: Dict[str, ModuleStatus]
    demo_mode_allowed: bool
    version: str = "2.4.0"
