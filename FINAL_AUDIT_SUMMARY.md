# GraphVision AI — Final Capstone Submission Audit Summary

**Generated:** November 17, 2026  
**Version:** 2.4.0 (Capstone Submission Ready)  
**Audit Type:** Independent verification of all documentation and implementation claims

---

## Executive Summary

| Category | Count |
|----------|-------|
| **PASS** | 8 |
| **FAIL** | 0 |
| **NOT VERIFIED** | 2 |

The source/documentation audit records eight PASS items and two NOT VERIFIED items. This does not mean every application feature has been runtime-tested. Backend test-suite execution and a fresh frontend production build remain unverified. Documentation corrections were applied for image-quality counts.

---

## Requirement-by-Requirement Verification

### 1. All 25 Participant Records & Image Mappings
**Status: PASS**

- ✅ `participants_pilot_25.csv`: 25 rows, P001–P025
- ✅ `samples_pilot_25.csv`: 25 rows, 1:1 mapping
- ✅ `pilot_questionnaire_25.csv`: 25 rows, 5-item Big Five proxies
- ✅ `pilot_extracted_features_25.csv`: 25 rows, 8 features + quality flags
- ✅ `image_quality_audit_25.csv`: 25 rows, per-image flags
- ✅ All 25 original images exist in `data/organized_samples/original_images/`
- ✅ All IDs match across all 5 CSVs and file system

### 2. Image-Quality Flag Counts (CORRECTED)
**Status: PASS** (after documentation correction)

| Flag | Count | Percentage | Participant IDs |
|------|-------|------------|-----------------|
| **Blur** (Laplacian var < 100) | 14 | 56% | P001–P005, P007, P009, P011, P014, P015, P018, P019, P020, P022 |
| **Show-through** (ink density > 30%) | 3 | 12% | P012, P024, P025 |
| **Segmentation issue** | 1 | 4% | P023 |
| **Reliable** (metrics_reliable=True) | 7 | 28% | P006, P008, P010, P013, P016, P017, P021 |
| **Total unreliable** | 18 | 72% | — |

**Documentation Corrected In:**
- `reports/dataset_audit.md`
- `reports/feature_extraction_report.md`
- `reports/exploratory_analysis_report.md`
- `frontend/src/pages/MethodologyPage.tsx`
- `README.md` (test/build verification section updated)

### 3. Eight Extracted Features Correctly Calculated
**Status: PASS**

All 8 features present in `pilot_extracted_features_25.csv`:
1. `ink_density_region` — foreground pixel ratio
2. `slant_angle_degrees` — central moment shear (-35° to +35°)
3. `estimated_char_height_px` — median line height × 0.42
4. `inter_word_gap_ratio` — median horizontal gap / width
5. `baseline_slope_deg` — linear regression on lower 30%
6. `baseline_variance` — residual variance of baseline fit
7. `stroke_thickness_px` — ink pixels / horizontal transitions
8. `consistency_score` — 1 - 0.35×CV(column density)

- ✅ `metrics_reliable` boolean correctly propagated (7 reliable, 18 unreliable)
- ✅ `quality_flag` string included per sample
- ✅ Feature extraction report documents estimation methods and limitations

### 4. Correlation Reports, Sample Sizes, P-Values Verified
**Status: PASS**

- ✅ Full N=25 correlation matrix matches saved CSV exactly
- ✅ Clean N=7 correlation matrix matches saved CSV exactly
- ✅ P-values match saved CSVs (N=25: all p=1.0 due to underpower; N=7: some <1.0 with documented approximations)
- ✅ Sample sizes correctly reported (N=25 full, N=7 clean)
- ✅ Strength labels applied: Strong (|r|≥0.5), Moderate (0.3–0.49), Weak (0.1–0.29)
- ✅ No causation claimed; explicit disclaimer in all reports

### 5. Backend Test Suite Execution
**Status: NOT VERIFIED**

**Reason:** Test execution requires `scikit-learn` and `scipy` which were unavailable in the execution environment due to proxy restrictions blocking PyPI access.

**Test Source Verification:** The test file (`training/test_personality_pipeline.py`) contains 16 software validation checks:
1. Syntax compilation (pipeline + test)
2. Feature names match backend extractor
3. Empty templates refused (exit 2)
4. Label disagreement between files refused
5. Broken path detection
6. Duplicate sample_id detection
7. Invalid score (outside 1–5) detection
8. Full run completes (exit 0)
9. Status marked EXPERIMENTAL
10. Dev/test writers disjoint
11. Small test set (<10 writers): CIs suppressed + warning
12. Selection uses only features models
13. Permutation procedure reproduces observed CV exactly
14. Test labels do not affect selection/CV/permutation
15. Test labels DO affect final test metrics
16. External cohort sharing writer_id refused

**Action Required:** Run in CI environment with dependencies installed.

### 6. Frontend Production Build
**Status: NOT VERIFIED**

| Check | Status | Details |
|-------|--------|---------|
| TypeScript compilation (`npx tsc --noEmit`) | **PASS** | 0 errors |
| Fresh `npm run build` | **NOT VERIFIED** | Vite/rolldown native binding issue (`@rolldown/binding-linux-x64-gnu`) prevents fresh bundle generation |
| Existing `frontend/dist/` | **Previously Generated** | Valid build from prior successful execution, not a fresh verification artifact |

**Action Required:** Run `npm run build` in a clean environment with native dependencies for full build verification.

### 7. Documentation Accuracy (PersonalityPage, MethodologyPage, README)
**Status: PASS**

**PersonalityPage.tsx:**
- ✅ Quality flag banner (rose for unreliable, amber for advisory)
- ✅ Reliability warning when `metrics_reliable === false`
- ✅ Status reflects quality: "warning" for flagged, "success" for usable
- ✅ Raw metric fields with N/A fallbacks
- ✅ "Experimental/Graphology" badges on all trait cards
- ✅ Bottom disclaimer: "not presented as psychological fact"

**MethodologyPage.tsx:**
- ✅ 8 limitations with severity (Critical/Major/Moderate)
- ✅ Pilot dataset card: N=25, reliable=7, EXPLORATORY ONLY
- ✅ Corrected blur count: "14/25 (56%)"

**README.md:**
- ✅ Complete data manifest with all CSV files
- ✅ Capstone compliance checklist (12/12 items)
- ✅ Test & build verification section accurately reflects NOT VERIFIED status
- ✅ No fabricated test results or build claims

### 8. Writer Identification Completely Removed
**Status: PASS**

- ✅ `backend/main.py`: writer routes commented out (lines 22, 43, 55)
- ✅ `backend/routes/`: no `writer.py` file
- ✅ Frontend pages: no Writer page in `frontend/src/pages/`
- ✅ MethodologyPage.tsx references "writers" only in dataset descriptions (IAM=657, power analysis ~194) — not as an active module
- ✅ No Writer Identification endpoint in API

### 9. No Untrained Personality Model Presented as Predictor
**Status: PASS**

**API Schema (`backend/schemas/responses.py`):**
- ✅ `model_connected: bool = Field(default=False, description="True when a trained multimodal checkpoint is loaded")`
- ✅ Returns `experimental_associations` (5 graphological heuristics), NOT Big Five predictions
- ✅ Disclaimer in every response: "not scientifically validated... should not be treated as a diagnosis"

**Frontend:**
- ✅ "Experimental Personality Associations" section header
- ✅ "Non-Clinical / Graphology" badges on trait cards
- ✅ Quality reliability warnings when `metrics_reliable === false`
- ✅ Bottom disclaimer: "not presented as psychological fact"

**Personality Model:**
- ✅ `PersonalityAnalysisModel.analyze()` returns heuristic scores (Organization, Confidence, Consistency, Social orientation, Attention to detail)
- ✅ No machine learning model loaded or trained
- ✅ All scores derived from rule-based mapping of geometric features

### 10. Documentation Reports Generated
**Status: PASS**

| Report | File | Status |
|--------|------|--------|
| Dataset Audit | `reports/dataset_audit.md` | ✅ Complete |
| Feature Extraction | `reports/feature_extraction_report.md` | ✅ Complete |
| Exploratory Analysis | `reports/exploratory_analysis_report.md` | ✅ Complete |
| Model Evaluation | `reports/model_evaluation_report.md` | ✅ Complete |
| Correlation Matrix (N=25) | `reports/correlation_matrix_full_N25.csv` | ✅ Generated |
| Correlation Matrix (N=7) | `reports/correlation_matrix_clean_N7.csv` | ✅ Generated |
| P-Values (N=25) | `reports/pvalues_full_N25.csv` | ✅ Generated |
| P-Values (N=7) | `reports/pvalues_clean_N7.csv` | ✅ Generated |

---

## Summary Table

| # | Requirement | Status |
|---|-------------|--------|
| 1 | 25 participant records & image mappings | **PASS** |
| 2 | Image-quality flag counts (corrected) | **PASS** |
| 3 | 8 extracted features correctly calculated | **PASS** |
| 4 | Correlation reports, sample sizes, p-values | **PASS** |
| 5 | Backend test suite execution | **NOT VERIFIED** (dependency proxy) |
| 6 | Fresh frontend production build | **NOT VERIFIED** (native binding issue) |
| 7 | Documentation accuracy (PersonalityPage, MethodologyPage, README) | **PASS** |
| 8 | Writer Identification removed | **PASS** |
| 9 | No untrained model as predictor | **PASS** |
| 10 | Documentation reports generated | **PASS** |

**Total: 8 PASS, 0 FAIL, 2 NOT VERIFIED**

---

## Not Verified Items — Root Cause & Resolution

| Item | Root Cause | Resolution Path |
|------|------------|-----------------|
| Backend tests | Proxy blocks PyPI → `sklearn`, `scipy` unavailable | Run in CI/CD pipeline with dependencies pre-installed |
| Frontend fresh build | Vite/rolldown missing `@rolldown/binding-linux-x64-gnu` | Build in environment with native dependencies; `npx tsc --noEmit` passes |

These items remain **NOT VERIFIED**; the available evidence does not establish whether the remaining issues are exclusively environmental or include code defects. The test source enumerates 16 software checks. The audit records TypeScript compilation as PASS, but a fresh production build remains unverified.

---

## Final Certification

**GraphVision AI v2.4.0 is capstone-ready** with the following conditions:

1. ⚠️ Source-level audit completed; backend test execution and fresh frontend build remain unverified
2. ✅ All documentation corrected (blur count: 14/25 = 56%)
3. ✅ No untrained model presented as predictor
4. ✅ Writer Identification fully removed
5. ✅ All participant data intact (25 records, no fabrication)
6. ⚠️ Backend tests & fresh frontend build require CI environment with dependencies

**Recommended CI Pipeline Steps:**
```yaml
# Backend
- pip install -r backend/requirements.txt
- pip install scikit-learn scipy pytest
- cd training && python -m pytest test_personality_pipeline.py -v

# Frontend  
- cd frontend && npm ci
- npx tsc --noEmit
- npm run build
```

---

**Audit Completed:** November 17, 2026  
**Auditor:** Independent Verification  
**Project:** GraphVision AI — Final-Year B.Tech Capstone