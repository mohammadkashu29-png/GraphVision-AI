# GraphVision AI — Handwriting Analysis, HTR & Signature Verification

Full-stack academic computer-vision prototype. This repository snapshot contains three application capabilities:

1. **Handwriting image analysis:** OpenCV preprocessing (grayscale, Otsu binarisation, horizontal ruling-line handling, connected-component filtering) and eight image measurements: `ink_density`, `writing_height`, `writing_width`, `stroke_width`, `word_spaces`, `average_gap`, `baseline_angle`, and `handwriting_lines`.
2. **Handwritten Text Recognition (HTR):** pretrained TrOCR (`microsoft/trocr-base-handwritten`) exposed through `GET /api/htr/status` and `POST /api/htr/recognize`, with a separate upload panel on the Handwriting Analysis page.
3. **Signature verification:** Siamese CNN inference is disabled until compatible trained weights and evaluation files are present. The training script is included.

## Important manuscript/repository consistency note

The accompanying research-paper draft describes an **experimental personality-association application module** and a different eight-feature vector: ink density, estimated slant angle, estimated character height, inter-word gap ratio, baseline slope, baseline variance, estimated stroke thickness, and spatial consistency. This repository snapshot does **not** contain that personality-association UI/API module, and its live OpenCV extractor currently returns the eight fields listed under capability 1 above. The separate `training/personality_pipeline.py` is a research evaluation pipeline; it is not the same thing as a deployed personality-association feature. Reconcile the paper and code version before submission. Do not claim this repository implements a different feature vector or a live personality predictor.

The 25-participant pilot dataset and its audit scripts/reports are not included in this ZIP snapshot. The separately supplied audit summary reports 25 participants, 7 reliable image records, and 18 flagged records; use the original data/report files as the source for those claims.

## Scientific scope

Image measurements describe visible image properties; they are not direct measures of personality or pen pressure. The five-item pilot questionnaire is exploratory and is not a validated Big Five instrument. No personality prediction accuracy is claimed. Signature outputs, when a trained checkpoint is connected, are model predictions rather than definitive authenticity judgments.

## Quick start

Python 3.10+ and Node.js 18+ are required.

### Backend

```bash
cd backend
python -m venv venv
# Windows PowerShell: .\venv\Scripts\Activate.ps1
# macOS/Linux: source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API documentation: `http://127.0.0.1:8000/docs`.

### Frontend

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` and `/media` to `http://localhost:8000`.

## HTR setup and operation

The backend loads `microsoft/trocr-base-handwritten` lazily on the first recognition request and reuses the model in memory. The first request downloads the model from Hugging Face, so the backend machine needs internet access and sufficient memory. CPU inference is supported but can be slow; CUDA is used when available.

- `GET /api/htr/status` reports whether the Transformers dependency is installed and whether the model has loaded.
- `POST /api/htr/recognize` accepts a multipart image field named `file` and returns transcription text, model ID, device, dimensions, and inference time.
- Upload PNG/JPG/JPEG images up to 10 MB.
- `microsoft/trocr-base-handwritten` is intended primarily for **handwritten text-line recognition**. The current UI sends the selected image as supplied; full-page or multi-line photographs may produce poor results. Crop a single clear text line before recognition for the most reliable initial test.
- Check `/api/htr/status` first. If recognition returns HTTP 503, inspect the response detail and backend terminal for dependency, network, or model-download errors. The service does not fabricate a transcription.
- Recognition is not guaranteed to be exact; compare output with the original image.

The HTR path uses Hugging Face Transformers and the TrOCR checkpoint. It does **not** use an OpenAI API key. `.env.example` only documents the optional model-ID override `GRAPHVISION_TROCR_MODEL`.

## Signature model setup

The application does not simulate signature inference. Verification remains unavailable until compatible trained weights and evaluation metadata are present in `backend/checkpoints/`.

```bash
python training/train_siamese.py --cedar /path/to/CEDAR --epochs 30
```

The checkpoint architecture and preprocessing configuration must match the training script. Do not copy weights from a different Colab architecture without checking input dimensions, embedding dimensions, normalisation, and state-dictionary keys.

## Personality research pipeline (not a website module)

`training/personality_pipeline.py` is a separate research-oriented pipeline for participant-level data with continuous questionnaire labels. It validates the participant/sample files, aggregates multiple samples by writer, uses writer-grouped development evaluation, compares feature models with baselines, and supports permutation testing. It is not exposed as a live personality-prediction endpoint in this repository snapshot.

The 25-person pilot described in the manuscript uses five exploratory questionnaire items (one per dimension) and only seven image records marked reliable. Those responses are not validated Big Five labels. Do not train or report predictive accuracy from this pilot as if it were a validated personality dataset.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health |
| POST | `/api/handwriting/analyze` | Preprocess image and extract eight live features |
| GET | `/api/htr/status` | TrOCR dependency/model status |
| POST | `/api/htr/recognize` | Handwritten text recognition |
| POST | `/api/signature/verify` | Signature comparison (requires compatible checkpoint) |
| GET | `/api/model/status`, `/api/model/evaluation` | Signature model status/evaluation |
| GET/DELETE | `/api/history` | Persisted analysis history |
| GET | `/api/stats` | Dashboard statistics |

## Verification status

The supplied final audit summary records eight PASS items, zero FAIL items, and **two** NOT VERIFIED items in its ten-row requirement table: (1) backend test-suite execution and (2) a fresh frontend production build. Its executive summary incorrectly says three NOT VERIFIED, and its test-check list says 13 while enumerating 16 checks. These count inconsistencies should be corrected in the audit document.

The audit summary reports TypeScript compilation as PASS, but a fresh production build remains NOT VERIFIED. Do not describe the entire application as fully runtime-verified on the basis of source inspection alone. The HTR route/component in this repository has been added, but end-to-end TrOCR inference must be tested on the target machine after installing dependencies and downloading the model.

### Backend software checks

```bash
cd training
python test_personality_pipeline.py --backend ../backend
```

The test script creates synthetic random images and questionnaire values to test software safeguards. Its results are software checks only, not handwriting or personality research evidence. Required packages include OpenCV, NumPy, pandas, SciPy, and scikit-learn.

### Frontend checks

```bash
cd frontend
npx tsc --noEmit
npm run build
```

Record the actual output from the target environment; do not carry forward an earlier PASS/NOT VERIFIED status without rerunning.

## References / model resources

- IAM Handwriting Database: use the official dataset citation associated with the version used in the experiment.
- CEDAR Signature Dataset: use the official dataset citation associated with the version used in training.
- TrOCR: M. Li et al., “TrOCR: Transformer-based Optical Character Recognition with Pre-trained Models,” 2021.

**Repository version note:** This README describes the contents of this ZIP snapshot, not every module described in the broader capstone manuscript.
