"""Offline HTR model evaluation script.

Evaluates one or more TrOCR model variants on the five test images using
the new projection-based line segmentation.  Produces:
  - Console output with per-image results
  - test_results/model_comparison.csv
  - test_results/model_comparison_report.md
  - test_results/final_htr_results.md
"""
import os, sys, time, json, csv

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

import cv2
import numpy as np
import torch
from PIL import Image
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

# Import the NEW segmentation
from services.line_segmentation import segment_lines

# ── Ground truth ──────────────────────────────────────────────────────────
GROUND_TRUTH = {
    "single_line.png": "optical character recognition",
    "two_lines.png": "The lion laughed at the mouse and\nlet him go. A few days later, the same",
    "five_lines.png": "Example of my current writing\nstyle, with the goal of making it\nboth pleasant and easy to read.\nAlways need more practice, but\nI hope you like it.",
    "ruled_paper.png": "I admire people who\nalways show kindness\nand help people, no matter\nif they are struggling with\ntheir own problems. They\nare truly a gift to\nthis world.",
    "tilted_handwriting.png": "Never regret being a good\nperson to the wrong people.\nYour behaviour says everything\nabout you, and their behaviour\nsays enough about them.",
}

EXPECTED_LINES = {
    "single_line.png": 1,
    "two_lines.png": 2,
    "five_lines.png": 5,
    "ruled_paper.png": 7,
    "tilted_handwriting.png": 5,
}

IMG_DIR = os.path.join(os.path.dirname(__file__),
                       "GraphVision_HTR_Test_Samples", "test_samples")
OUT_DIR = os.path.join(os.path.dirname(__file__), "test_results")
os.makedirs(OUT_DIR, exist_ok=True)

# ── Metrics ───────────────────────────────────────────────────────────────
def levenshtein(a: str, b: str) -> int:
    n, m = len(a), len(b)
    if n == 0: return m
    if m == 0: return n
    prev = list(range(m + 1))
    for i in range(1, n + 1):
        cur = [i] + [0] * m
        for j in range(1, m + 1):
            cost = 0 if a[i-1] == b[j-1] else 1
            cur[j] = min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + cost)
        prev = cur
    return prev[m]

def cer(ref: str, hyp: str) -> float:
    ref_n = " ".join(ref.split())
    hyp_n = " ".join(hyp.split())
    return levenshtein(ref_n, hyp_n) / max(1, len(ref_n))

def wer(ref: str, hyp: str) -> float:
    ref_w = ref.split()
    hyp_w = hyp.split()
    n, m = len(ref_w), len(hyp_w)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1): dp[i][0] = i
    for j in range(m + 1): dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if ref_w[i-1] == hyp_w[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[n][m] / max(1, n)

# ── Model evaluation ─────────────────────────────────────────────────────
def evaluate_model(model_id: str, files: list) -> list:
    """Run the model on each file and return a list of result dicts."""
    print(f"\n{'='*60}")
    print(f"Evaluating: {model_id}")
    print(f"{'='*60}")

    t0 = time.perf_counter()
    processor = TrOCRProcessor.from_pretrained(model_id)
    model = VisionEncoderDecoderModel.from_pretrained(model_id)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    model.eval()
    load_time = time.perf_counter() - t0
    print(f"Model loaded in {load_time:.1f}s on {device}")

    results = []
    for fname in files:
        path = os.path.join(IMG_DIR, fname)
        image = Image.open(path).convert("RGB")
        ref = GROUND_TRUTH[fname]
        exp_lines = EXPECTED_LINES[fname]

        # Segment
        t1 = time.perf_counter()
        line_imgs = segment_lines(image)
        seg_time = time.perf_counter() - t1

        # Recognise each line
        line_preds = []
        t2 = time.perf_counter()
        for li in line_imgs:
            pv = processor(images=li, return_tensors="pt").pixel_values.to(device)
            with torch.inference_mode():
                gen = model.generate(pv, max_new_tokens=128)
            txt = processor.batch_decode(gen, skip_special_tokens=True)[0].strip()
            line_preds.append(txt)
        recog_time = time.perf_counter() - t2
        total_time = seg_time + recog_time

        combined = "\n".join(line_preds)
        c = cer(ref, combined)
        w = wer(ref, combined)

        result = {
            "model_id": model_id,
            "filename": fname,
            "expected_lines": exp_lines,
            "detected_lines": len(line_imgs),
            "line_predictions": line_preds,
            "combined_text": combined,
            "ground_truth": ref,
            "CER": round(c, 4),
            "WER": round(w, 4),
            "seg_time_ms": round(seg_time * 1000, 1),
            "recog_time_ms": round(recog_time * 1000, 1),
            "total_time_ms": round(total_time * 1000, 1),
            "device": str(device),
        }
        results.append(result)

        print(f"\n--- {fname} ---")
        print(f"  Expected lines: {exp_lines}  Detected: {len(line_imgs)}")
        for i, lp in enumerate(line_preds):
            gt_line = ref.split("\n")[i] if i < len(ref.split("\n")) else "(no GT)"
            print(f"  Line {i+1}: {lp!r}")
            print(f"     GT : {gt_line!r}")
        print(f"  CER: {c:.4f}  WER: {w:.4f}  Time: {total_time*1000:.0f}ms")

    return results


def main():
    files = list(GROUND_TRUTH.keys())

    # Models to evaluate
    models_to_test = ["microsoft/trocr-base-handwritten"]

    # Check if large model is available
    try:
        import huggingface_hub
        cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
        if os.path.exists(os.path.join(cache_dir, "models--microsoft--trocr-large-handwritten")):
            models_to_test.append("microsoft/trocr-large-handwritten")
            print("Large model found in cache, will evaluate.")
        else:
            print("Large model not yet cached. Skipping for now.")
    except Exception:
        pass

    all_results = []
    for mid in models_to_test:
        try:
            results = evaluate_model(mid, files)
            all_results.extend(results)
        except Exception as e:
            print(f"ERROR evaluating {mid}: {e}")

    # ── Write CSV ─────────────────────────────────────────────────────
    csv_path = os.path.join(OUT_DIR, "model_comparison.csv")
    fieldnames = ["model_id", "filename", "expected_lines", "detected_lines",
                  "CER", "WER", "total_time_ms", "device", "combined_text"]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for r in all_results:
            writer.writerow(r)
    print(f"\nCSV saved: {csv_path}")

    # ── Write comparison report ───────────────────────────────────────
    report_path = os.path.join(OUT_DIR, "model_comparison_report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# HTR Model Comparison Report\n\n")
        f.write(f"**Date:** {time.strftime('%Y-%m-%d %H:%M')}\n")
        f.write(f"**Device:** {all_results[0]['device'] if all_results else 'N/A'}\n\n")

        # Summary table
        f.write("## Summary\n\n")
        f.write("| Model | Avg CER | Avg WER | Avg Time (ms) |\n")
        f.write("|-------|---------|---------|---------------|\n")
        for mid in models_to_test:
            mrs = [r for r in all_results if r["model_id"] == mid]
            if mrs:
                avg_cer = sum(r["CER"] for r in mrs) / len(mrs)
                avg_wer = sum(r["WER"] for r in mrs) / len(mrs)
                avg_time = sum(r["total_time_ms"] for r in mrs) / len(mrs)
                f.write(f"| {mid} | {avg_cer:.4f} | {avg_wer:.4f} | {avg_time:.0f} |\n")

        # Per-image details for each model
        for mid in models_to_test:
            mrs = [r for r in all_results if r["model_id"] == mid]
            f.write(f"\n## {mid}\n\n")
            for r in mrs:
                f.write(f"### {r['filename']}\n\n")
                f.write(f"- Expected lines: {r['expected_lines']}\n")
                f.write(f"- Detected lines: {r['detected_lines']}\n")
                f.write(f"- CER: {r['CER']:.4f}\n")
                f.write(f"- WER: {r['WER']:.4f}\n")
                f.write(f"- Time: {r['total_time_ms']:.0f}ms\n\n")
                f.write("**Predictions:**\n\n")
                for i, lp in enumerate(r["line_predictions"]):
                    f.write(f"{i+1}. `{lp}`\n")
                f.write(f"\n**Ground truth:**\n\n")
                for i, gt in enumerate(r["ground_truth"].split("\n")):
                    f.write(f"{i+1}. `{gt}`\n")
                f.write("\n---\n\n")
    print(f"Report saved: {report_path}")

    # ── Determine best model ──────────────────────────────────────────
    best_model = None
    best_avg_cer = 999
    for mid in models_to_test:
        mrs = [r for r in all_results if r["model_id"] == mid]
        if mrs:
            avg = sum(r["CER"] for r in mrs) / len(mrs)
            if avg < best_avg_cer:
                best_avg_cer = avg
                best_model = mid

    # ── Write final results ───────────────────────────────────────────
    final_path = os.path.join(OUT_DIR, "final_htr_results.md")
    best_results = [r for r in all_results if r["model_id"] == best_model]
    with open(final_path, "w", encoding="utf-8") as f:
        f.write("# Final HTR Results — GraphVision AI\n\n")
        f.write(f"**Best model:** `{best_model}`\n")
        f.write(f"**Average CER:** {best_avg_cer:.4f}\n")
        avg_wer_best = sum(r["WER"] for r in best_results) / len(best_results)
        avg_time_best = sum(r["total_time_ms"] for r in best_results) / len(best_results)
        f.write(f"**Average WER:** {avg_wer_best:.4f}\n")
        f.write(f"**Average processing time:** {avg_time_best:.0f}ms per image\n")
        f.write(f"**Device:** {best_results[0]['device']}\n\n")

        f.write("## Per-image results\n\n")
        f.write("| Image | Exp. Lines | Det. Lines | CER | WER | Time (ms) |\n")
        f.write("|-------|-----------|-----------|------|------|----------|\n")
        for r in best_results:
            f.write(f"| {r['filename']} | {r['expected_lines']} | {r['detected_lines']} "
                    f"| {r['CER']:.4f} | {r['WER']:.4f} | {r['total_time_ms']:.0f} |\n")

        f.write("\n## Detailed predictions\n\n")
        for r in best_results:
            f.write(f"### {r['filename']}\n\n")
            f.write(f"**Predicted:**\n```\n{r['combined_text']}\n```\n\n")
            f.write(f"**Ground truth:**\n```\n{r['ground_truth']}\n```\n\n")
            f.write(f"CER: {r['CER']:.4f} | WER: {r['WER']:.4f}\n\n---\n\n")

        f.write("## Startup commands\n\n")
        f.write("### Backend\n```bash\n")
        f.write("cd graphvision-ai/backend\n")
        f.write("# activate venv\n")
        f.write("uvicorn main:app --host 127.0.0.1 --port 8001\n")
        f.write("```\n\n")
        f.write("### Frontend\n```bash\n")
        f.write("cd graphvision-ai/frontend\n")
        f.write("npm run dev    # development\n")
        f.write("npm run build  # production build\n")
        f.write("```\n")

    print(f"Final results saved: {final_path}")
    print(f"\nBest model: {best_model} (avg CER: {best_avg_cer:.4f})")


if __name__ == "__main__":
    main()
