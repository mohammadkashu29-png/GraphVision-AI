# GraphVision AI — paper, repository, and audit reconciliation

Review date: 17 November 2026

## 1. What this ZIP actually contains

The current repository snapshot contains three website capabilities: OpenCV handwriting-image analysis, TrOCR handwritten text recognition, and Siamese-CNN signature verification (which remains unavailable until compatible trained weights and evaluation metadata exist). It also contains a separate `training/personality_pipeline.py` research pipeline. It does **not** contain a deployed personality-association page/API module in this snapshot.

## 2. Manuscript mismatches to resolve before submission

| Manuscript claim | Evidence in this repository snapshot | Required treatment |
|---|---|---|
| Four functional application modules, including experimental personality association | Three website capabilities are present; no personality UI/API route is registered in `backend/main.py` | Either implement and test the personality module in this codebase, or revise the paper to describe it as a research/experimental component not exposed by this website snapshot. |
| Eight features: ink density, slant, character height, inter-word gap ratio, baseline slope/variance, stroke thickness, spatial consistency | Live `backend/services/handwriting_pipeline.py` returns `ink_density`, `writing_height`, `writing_width`, `stroke_width`, `word_spaces`, `average_gap`, `baseline_angle`, and `handwriting_lines` | Do not describe the manuscript feature vector as the live website extractor unless the backend is updated and re-audited. |
| Signature verification as an operational feature | Route and UI exist, but runtime verification is gated on compatible trained weights/evaluation files | Describe as implemented integration/architecture with inference gated until a trained checkpoint is available; do not claim measured verification accuracy without an evaluation artifact. |
| HTR works on full handwritten pages | TrOCR checkpoint is line-oriented; current HTR component sends the selected image as a single input | For initial tests, crop to one clear handwritten line. Automatic page-to-line segmentation is not implemented in this snapshot. |
| Pilot data and its reports are part of the ZIP | The 25-participant source data and report CSVs are not included in this project ZIP | Cite the separately maintained dataset/audit files; do not imply the data are bundled here. |

## 3. HTR integration review

The repository now includes:

- `backend/services/htr_service.py` — lazy TrOCR loading and inference;
- `backend/routers/htr.py` — `GET /api/htr/status` and `POST /api/htr/recognize`;
- `frontend/src/components/HTRRecognition.tsx` — upload, status, transcription, copy, and error UI;
- `frontend/src/api/client.ts` — API calls;
- `backend/main.py` — router registration.

The HTR service uses Hugging Face Transformers and `microsoft/trocr-base-handwritten`, not the OpenAI Vision API. The supplied `.env.example` was therefore corrected to `GRAPHVISION_TROCR_MODEL`. A transient failed model download is no longer cached permanently; a later request can retry.

The environment used for this review has PyTorch and TorchVision, but `transformers` is not installed. Python source compilation passed; model download and end-to-end inference were therefore **not tested**. Install `backend/requirements.txt`, start the backend, check `/api/htr/status`, and test a cropped single-line image on the target machine. The first request requires Hugging Face network access and may take several minutes.

## 4. Audit-document corrections

The supplied `FINAL_AUDIT_SUMMARY.md` had two internal arithmetic/count errors:

- Its summary table has ten requirements: eight PASS, zero FAIL, and two NOT VERIFIED (backend test execution and fresh frontend production build). The executive summary incorrectly said three NOT VERIFIED.
- Its software-check list enumerates 16 checks, not 13.

Those counts have been corrected. The wording no longer claims all functionality is runtime-verified or that unverified issues are definitely not code defects.

The older uploaded README described Writer Identification as an active module and referred to source paths that do not exist in this ZIP. It has been replaced with a README that describes the actual repository snapshot and clearly states its limitations.

## 5. Checks performed during this review

- Python `compileall` on `backend/` and `training/`: PASS.
- HTR status function: correctly reports that `transformers` is missing in this review environment; no model is reported as loaded.
- Backend personality-pipeline test script: attempted, but the run exceeded the available execution window; NOT VERIFIED.
- Frontend TypeScript/build: NOT VERIFIED in this review session; dependencies were not installed from the project lockfile here.
- TrOCR model download/inference: NOT VERIFIED because `transformers` is absent and external model download was not performed.

## 6. Submission recommendation

Before final submission, make one explicit choice: (A) implement and verify the personality-association module in this exact repository snapshot, or (B) revise the manuscript so it does not claim that this website snapshot implements that module or the manuscript's alternate feature vector. Also run the HTR inference test and a fresh frontend production build on the target development machine.
