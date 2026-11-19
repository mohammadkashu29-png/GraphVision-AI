# HTR implementation notes

## Current implementation

- Model: `microsoft/trocr-base-handwritten` (Hugging Face Transformers).
- Backend service: `backend/services/htr_service.py`.
- API: `GET /api/htr/status` and `POST /api/htr/recognize` (multipart field: `file`).
- Frontend: `frontend/src/components/HTRRecognition.tsx`, embedded on the Handwriting Analysis page.
- Model is loaded lazily on the first request and retained in memory.
- A failed model download/load is reported as HTTP 503 and may be retried on a later request; the backend no longer permanently caches a transient load failure.

## Important recognition limitation

The selected TrOCR checkpoint is intended primarily for handwritten text-line recognition. The current website sends the uploaded image as a single image; it does not yet perform reliable page-to-line segmentation or crop multiple text lines automatically. For testing, upload a tightly cropped, well-lit image containing one handwritten line. Full-page or multi-line images may produce poor or incomplete transcriptions.

## Runtime requirements

Install `backend/requirements.txt`. The TrOCR runtime requires compatible `torch` and `torchvision` packages, `transformers`, `sentencepiece`, and Pillow. The first request needs network access to download the model from Hugging Face. CPU inference is supported but may be slow; CUDA is used when available.

## Verification status

Python source compilation was checked in the review environment. `transformers` was not installed in that environment, so model loading and end-to-end TrOCR inference were not tested. Verify `/api/htr/status`, then test a cropped single-line sample on the target machine. Do not claim HTR accuracy without a labelled benchmark evaluation.
