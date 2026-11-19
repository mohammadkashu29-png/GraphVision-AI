# Handwriting + Big Five data-collection protocol (draft; needs ethics/IRB approval before use)

**Goal:** paired handwriting samples and questionnaire-based Big Five scores, collected so that a null result is detectable.

## Participants
- Consenting adults (18+). Record `writer_id` (pseudonymous); keep the name↔id key in a separate, encrypted file.
- Sample size: ~194 writers to detect r = 0.20 (80 % power, two-sided α = 0.05); ~287 if testing 5 traits with Bonferroni (α = 0.01). Smaller pilots are fine but cannot support claims.

## Labels (ground truth)
- Self-report Big Five from a validated, free instrument (e.g., IPIP Big-Five markers, https://ipip.ori.org/, or BFI-10). Store continuous scale scores, not only high/low splits.
- Administer it separately from the writing task. Do **not** use graphologist judgements or rule tables as labels; they are not psychological ground truth.

## Writing tasks (same for everyone)
1. Fixed copy passage (identical text for all writers).
2. Pangram, written twice.
3. Short free writing (≥ 5 lines) on a neutral prompt.
4. (Optional) signature ×3, for Module A only. Never use it as a personality predictor.

## Acquisition (reduce shortcuts)
- Same paper type, same pen type, plain white paper (also collect a ruled-paper subset if you want to test line removal).
- Scan at 300 dpi, same scanner, PNG, no auto-enhance. Record device and dpi.
- Two sessions ≥ 1 week apart to measure feature stability.
- Record covariates: age band, handedness, education level, first language, device. Use them as baselines/controls, not as targets.

## Splits
- Always split by `writer_id` (all samples, tasks and sessions of a writer in one split).
- Lock a test set before looking at any model results. Preregister traits, features, minimum effect size and analysis plan.

## Files
- `participants.csv` — one row per writer (labels + covariates).
- `samples.csv` — one row per image.
- `images/` — scans, named `<sample_id>.png`.
- Validate with `python validate_dataset.py`. Analyse with `personality_protocol.py` (needs `f_*`, `c_*`, `t_*` columns joined from these files).
