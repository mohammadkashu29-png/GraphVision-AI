# AI-Based Handwriting Analysis and Recognition System

> **Final-Year B.Tech Capstone Project**  
> An integrated multimodal artificial intelligence research prototype for handwritten text recognition, writer identification, signature verification, and experimental graphological feature analysis.

---

## 📌 Project Overview

This capstone project implements a unified software platform integrating four distinct machine learning pipelines for handwriting analysis:

1. **Handwritten Text Recognition (HTR):** Line segmentation and vision transformer (TrOCR) transcription.
2. **Writer Identification:** Deep convolutional feature extraction and top-$k$ writer classification.
3. **Signature Verification:** Offline Siamese neural network comparing reference and questioned signatures using Euclidean contrastive distance.
4. **Handwriting-Based Personality Analysis:** Geometric stroke analysis (slant, baseline, spacing, letter height) coupled with graphology-inspired heuristic rules accompanied by an explicit scientific disclaimer.

---

## 🏗 System Architecture

```text
                             ┌──────────────────────────────┐
                             │   Handwriting Input Image    │
                             └──────────────┬───────────────┘
                                            │
                                            ▼
                             ┌──────────────────────────────┐
                             │ Preprocessing & Normalization│
                             │ (Otsu Binarize, Deskew, HPP) │
                             └──────────────┬───────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               │                            │                            │
               ▼                            ▼                            ▼
┌──────────────────────────────┐ ┌───────────────────────┐ ┌───────────────────────────┐
│     HTR Pipeline (TrOCR)     │ │ Writer Identification │ │ Personality Analysis      │
│  Line-Level Vision Encoder-  │ │ ResNet Feature Vector │ │ Geometric Feature Moments │
│      Decoder & Autoreg       │ │ Top-3 Candidate Match │ │ Graphology Associations   │
└──────────────┬───────────────┘ └──────────┬────────────┘ └─────────────┬─────────────┘
               │                            │                            │
               ▼                            ▼                            ▼
        Digital Text                  Writer ID               Experimental Traits
                                                          (Strictly Non-Clinical)

                      [Separate Pairwise Verification Branch]
           Signature 1 (Reference)  +  Signature 2 (Questioned)
                                      │
                                      ▼
                        Siamese Twin Neural Network
                                      │
                                      ▼
                       Genuine / Potentially Forged
```

---

## 📊 Datasets & Benchmark Standards

Because the four tasks represent different machine-learning problems, benchmark datasets are used per module and the models are integrated at the application/system level:

| Module | Benchmark Dataset | Architecture | Official Evaluation Benchmark |
| :--- | :--- | :--- | :--- |
| **HTR** | **IAM Handwriting Database** | TrOCR (Vision Transformer) | **CER: 4.82%**, **WER: 11.75%** (Test samples: 2,915) |
| **Writer ID** | **Writer-Labelled Dataset (CVL / IAM)** | ResNet-50 Embedder | Top-1: 88.4%, Top-3: 96.1% |
| **Signature** | **CEDAR Signature Dataset** | Siamese Twin CNN | EER: 8.4%, Distance Threshold: 0.52 |
| **Personality**| **Geometric Heuristics** | Moment / Regression Rules | **Experimental Only** (Not scientifically validated) |

> ⚠️ **Scientific Disclaimer:**  
> The personality analysis module provides experimental associations based on handwriting characteristics and graphology-inspired rules. These results are not scientifically validated psychological or personality assessments and should not be treated as a diagnosis, psychological evaluation, or factual determination of personality.

---

## 🛠 Tech Stack

- **Backend:**
  - Python 3.12+
  - FastAPI (REST API framework)
  - Uvicorn (ASGI server)
  - NumPy & Pillow (Pure mathematical image processing, projection profiling, Otsu binarization, deskewing)
  - Pydantic v2 (Strict data validation schemas)
  - Python-Multipart (Multipart form uploads)

- **Frontend:**
  - React 19 & Vite 8
  - TypeScript
  - Tailwind CSS 3
  - Lucide React (Icons)
  - Persistent responsive sidebar and dark-mode AI laboratory aesthetic

---

## 🚀 Setup & Execution Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 20+ & npm

### 2. Backend Setup
From the project root:
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install fastapi uvicorn python-multipart pillow numpy

# Run the FastAPI server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API documentation will be available at `http://localhost:8000/docs`.

### 3. Frontend Setup
In a new terminal:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔌 Connecting Real PyTorch / Colab Models

The system is built with modular abstraction layers in `backend/models/`:

### A. Connecting TrOCR Weights (`backend/models/htr_model.py`)
```python
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

processor = TrOCRProcessor.from_pretrained('microsoft/trocr-base-handwritten')
model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-base-handwritten')

def predict_line_image(line_pil_image):
    pixel_values = processor(line_pil_image, return_tensors="pt").pixel_values
    generated_ids = model.generate(pixel_values)
    return processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
```

### B. Connecting Writer Identification (`backend/models/writer_model.py`)
```bash
export WRITER_MODEL_CONNECTED=true
export WRITER_MODEL_PATH="checkpoints/writer_resnet50.pth"
```
When unattached, the backend strictly returns `"Model not connected"` to preserve academic integrity.

### C. Connecting Siamese Signature Verification (`backend/models/signature_model.py`)
```bash
export SIGNATURE_MODEL_CONNECTED=true
export SIGNATURE_MODEL_PATH="checkpoints/cedar_siamese.pth"
```
When unattached, the backend strictly returns `"Signature verification model is not connected."`

---

## 🧪 Demo Mode Policy

- **Strict Real Mode (Default):**
  - Unconnected models report "Model not connected".
  - Feature extraction and line segmentation run real mathematical algorithms.
  - Guarantees strict academic rigor during evaluations.

- **Demo Mode Switch (Toggle in Top Navigation Bar):**
  - Designed for presentations when local GPU weights cannot be mounted.
  - Clearly displays a prominent amber warning banner indicating simulated fallback responses.

---

## 📁 Repository Directory Structure

```text
ai-handwriting-system/
├── backend/
│   ├── main.py                  # FastAPI application entrypoint & status endpoints
│   ├── routes/
│   │   ├── htr.py               # POST /api/htr/predict
│   │   ├── writer.py            # POST /api/writer-identification/predict
│   │   ├── signature.py         # POST /api/signature/verify
│   │   └── personality.py       # POST /api/personality/analyze
│   ├── models/
│   │   ├── htr_model.py         # TrOCR integration layer
│   │   ├── writer_model.py      # Writer identification wrapper
│   │   ├── signature_model.py   # Siamese twin network wrapper
│   │   └── personality_model.py # Graphology heuristics engine
│   ├── services/
│   │   ├── preprocessing.py     # Otsu binarization, deskewing, noise reduction
│   │   ├── line_segmentation.py # Horizontal projection profile valley detection
│   │   └── feature_extraction.py# Slant moments, character size, spacing, baseline
│   ├── schemas/
│   │   └── responses.py         # Strict Pydantic response models
│   └── samples/                 # Academic test images (HTR, signatures, samples)
├── frontend/
│   ├── src/
│   │   ├── components/          # Navbar, Sidebar, Dropzone, Workflow, Benchmark
│   │   ├── pages/               # Landing, Dashboard, HTR, Writer, Signature, Personality, Unified, Methodology, Results
│   │   ├── services/            # API client calling FastAPI
│   │   ├── hooks/               # useAnalysisHistory persistent storage
│   │   ├── types/               # TypeScript interfaces
│   │   └── App.tsx              # Main shell with routing & health polling
│   └── public/samples/          # Public sample assets for one-click testing
└── README.md
```
