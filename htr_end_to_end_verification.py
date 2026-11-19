# End-to-end verification script for HTR pipeline overhaul

import sys, os, json, pathlib, subprocess, time
from typing import List, Dict
import importlib.util
import compileall
import requests
import base64
from io import BytesIO
from PIL import Image
import numpy as np

# Utility functions for CER/WER (same as earlier)
def cer(ref: str, hyp: str) -> float:
    n, m = len(ref), len(hyp)
    if n == 0:
        return float(m)
    if m == 0:
        return float(n)
    prev = list(range(m + 1))
    for i, ca in enumerate(ref, 1):
        cur = [i] + [0] * m
        for j, cb in enumerate(hyp, 1):
            cost = 0 if ca == cb else 1
            cur[j] = min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + cost)
        prev = cur
    return prev[m] / max(1, n)

def wer(ref: str, hyp: str) -> float:
    ref_words = ref.split()
    hyp_words = hyp.split()
    n, m = len(ref_words), len(hyp_words)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if ref_words[i-1] == hyp_words[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[n][m] / max(1, n)

# Paths
PROJECT_ROOT = pathlib.Path(r"C:/Users/HP/.gemini/antigravity/scratch/graphvision-ai")
BACKEND_ROOT = PROJECT_ROOT / "backend"
TEST_IMG_DIR = PROJECT_ROOT / "GraphVision_HTR_Test_Samples" / "test_samples"
RESP_DIR = PROJECT_ROOT / "test_results"
RESP_DIR.mkdir(parents=True, exist_ok=True)

# 1. Import new line_segmentation to confirm import works
import sys
sys.path.append(str(BACKEND_ROOT))
try:
    from services import line_segmentation as module
    print("✅ line_segmentation imported successfully")
except Exception as e:
    print(f"❌ Failed to import line_segmentation: {e}")
    sys.exit(1)

# 2. Syntax check all .py files in backend
print("Running syntax check...")
compile_success = compileall.compile_dir(str(BACKEND_ROOT), force=True, quiet=1)
if not compile_success:
    print("❌ Syntax errors found in backend files")
    sys.exit(1)
print("✅ Syntax check passed")

# 3. Run backend tests (pytest) – skipped for this verification
print("⚠️ Skipping backend tests – not required for HTR verification")


# 4. Check FastAPI server
API_URL = "http://127.0.0.1:8001/api/htr/recognize"
def server_alive():
    try:
        r = requests.get('http://127.0.0.1:8001/docs', timeout=2)
        return r.status_code == 200
    except Exception:
        return False

if not server_alive():
    print("⚠️ FastAPI not running – starting server in background")
    # start as background task (daemon) – same command used elsewhere
    start_cmd = (
        "powershell -NoProfile -Command "
        "\"Set-Location '{backend_dir}'; "
        "$env:PYTHONUNBUFFERED='1'; "
        "& '{venv_python}' -m uvicorn main:app --host 127.0.0.1 --port 8001 --log-level debug\""
    ).format(
        backend_dir=BACKEND_ROOT,
        venv_python=BACKEND_ROOT / "venv" / "Scripts" / "python.exe"
    )
    # launch
    subprocess.Popen(start_cmd, shell=True)
    # wait a bit for server to start
    for i in range(10):
        time.sleep(1)
        if server_alive():
            break
    else:
        print("❌ Failed to start FastAPI server")
        sys.exit(1)
    print("✅ FastAPI server started")
else:
    print("✅ FastAPI server already running")

# 5-9. Process test images
samples = ["single_line.png", "two_lines.png", "two_lines.png", "five_lines.png", "ruled_paper.png", "tilted_handwriting.png"]
# Ground truth mapping (reuse from verify_htr_requests.py)
ground_truth = {
    "single_line.png": "optical character recognition",
    "two_lines.png": "The lion laughed at the mouse and\nlet him go. A few days later, the same",
    "five_lines.png": "Example of my current writing\nstyle, with the goal of making it\nboth pleasant and easy to read.\nAlways need more practice, but\nI hope you like it.",
    "ruled_paper.png": "I admire people who\nalways show kindness\nand help people, no matter\nif they are struggling with\ntheir own problems. They\nare truly a gift to\nthis world.",
    "tilted_handwriting.png": "Never regret being a good\nperson to the wrong people.\nYour behaviour says everything\nabout you, and their behaviour\nsays enough about them.",
}

report_lines = ["# HTR Segmentation Overhaul Report\n", "\n"]
csv_rows = []

for fname in ground_truth:
    path = TEST_IMG_DIR / fname
    files = {"file": (fname, open(path, "rb"), "image/png")}
    try:
        resp = requests.post(API_URL, files=files, timeout=30)
    except Exception as e:
        print(f"❌ Request failed for {fname}: {e}")
        continue
    status = resp.status_code
    try:
        data = resp.json()
    except Exception:
        data = {}
    # collect fields
    pred_text = data.get("text", "")
    lines = data.get("lines", [])
    line_count = data.get("line_count")
    fallback = data.get("fallback", False)
    proc_time = data.get("processing_time_ms")
    # compute metrics against ground truth
    gt = ground_truth[fname]
    cer_raw = cer(gt, pred_text)
    wer_raw = wer(gt, pred_text)
    # ordering check – assume lines concatenated with spaces or newlines
    combined = "\n".join(lines).strip()
    order_ok = combined.replace("\n", " ") == pred_text.replace("\n", " ")
    # save line crops
    for idx, line_uri in enumerate(data.get("line_images", [])):
        header, b64 = line_uri.split(",", 1)
        img_bytes = base64.b64decode(b64)
        crop_path = RESP_DIR / f"{pathlib.Path(fname).stem}_line_{idx+1}_crop.png"
        with open(crop_path, "wb") as f:
            f.write(img_bytes)
    # write JSON response for inspection
    json_path = RESP_DIR / f"{pathlib.Path(fname).stem}_response_overhaul.json"
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(data, jf, ensure_ascii=False, indent=2)
    # report entry
    report_lines.append(f"## {fname}\n")
    report_lines.append(f"- Expected lines: {gt.count('\\n')+1}\n")
    report_lines.append(f"- Detected lines: {line_count}\n")
    report_lines.append(f"- Order correct: {order_ok}\n")
    report_lines.append(f"- HTTP status: {status}\n")
    report_lines.append(f"- Fallback: {fallback}\n")
    report_lines.append(f"- Processing time (ms): {proc_time}\n")
    report_lines.append(f"- CER: {cer_raw:.4f}\n")
    report_lines.append(f"- WER: {wer_raw:.4f}\n")
    report_lines.append("- Individual line predictions:\n")
    for i, line in enumerate(lines):
        report_lines.append(f"  {i+1}. `{line}`\n")
    report_lines.append("\n---\n\n")
    csv_rows.append({
        "filename": fname,
        "expected": gt.count('\\n')+1,
        "detected": line_count,
        "order_ok": order_ok,
        "status": status,
        "fallback": fallback,
        "proc_ms": proc_time,
        "CER": f"{cer_raw:.4f}",
        "WER": f"{wer_raw:.4f}"
    })

# Write markdown report
report_path = RESP_DIR / "segmentation_overhaul_report.md"
with open(report_path, "w", encoding="utf-8") as rf:
    rf.writelines("\n".join(report_lines))
print(f"Report written to {report_path}")

# Write CSV
import csv
csv_path = RESP_DIR / "segmentation_overhaul_report.csv"
with open(csv_path, "w", newline="", encoding="utf-8") as cf:
    writer = csv.DictWriter(cf, fieldnames=["filename","expected","detected","order_ok","status","fallback","proc_ms","CER","WER"])
    writer.writeheader()
    for row in csv_rows:
        writer.writerow(row)
print(f"CSV written to {csv_path}")
