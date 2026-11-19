import os, sys, json, time, base64, csv
import urllib.request
import urllib.parse

# Helper: simple Levenshtein distance for strings
def levenshtein(a, b):
    n, m = len(a), len(b)
    if n == 0:
        return m
    if m == 0:
        return n
    # Initialize matrix
    prev = list(range(m + 1))
    for i, ca in enumerate(a, 1):
        cur = [i] + [0] * m
        for j, cb in enumerate(b, 1):
            cost = 0 if ca == cb else 1
            cur[j] = min(prev[j] + 1,        # deletion
                         cur[j-1] + 1,      # insertion
                         prev[j-1] + cost)  # substitution
        prev = cur
    return prev[m]

def cer(ref, hyp):
    # normalize whitespace (keep punctuation & case)
    ref_n = " ".join(ref.split())
    hyp_n = " ".join(hyp.split())
    dist = levenshtein(ref_n, hyp_n)
    return dist / max(1, len(ref_n))

def wer(ref, hyp):
    ref_words = ref.split()
    hyp_words = hyp.split()
    n, m = len(ref_words), len(hyp_words)
    dp = [[0]*(m+1) for _ in range(n+1)]
    for i in range(n+1):
        dp[i][0] = i
    for j in range(m+1):
        dp[0][j] = j
    for i in range(1, n+1):
        for j in range(1, m+1):
            if ref_words[i-1] == hyp_words[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[n][m] / max(1, n)

# Ground‑truth mapping (as extracted manually from GROUND_TRUTH.txt)
GROUND_TRUTH = {
    "single_line.png": "optical character recognition",
    "two_lines.png": "The lion laughed at the mouse and\nlet him go. A few days later, the same",
    "five_lines.png": "Example of my current writing\nstyle, with the goal of making it\nboth pleasant and easy to read.\nAlways need more practice, but\nI hope you like it.",
    "ruled_paper.png": "I admire people who\nalways show kindness\nand help people, no matter\nif they are struggling with\ntheir own problems. They\nare truly a gift to\nthis world.",
    "tilted_handwriting.png": "Never regret being a good\nperson to the wrong people.\nYour behaviour says everything\nabout you, and their behaviour\nsays enough about them.",
}

# Directory with test images
IMG_DIR = r"C:\\Users\\HP\\.gemini\\antigravity\\scratch\\graphvision-ai\\GraphVision_HTR_Test_Samples\\test_samples"
# Output folder inside artifact directory
ARTIFACT_ROOT = r"C:\\Users\\HP\\.gemini\\antigravity\\brain\\d2663d34-51c9-4aac-a838-5a002a8d0282"
OUT_DIR = os.path.join(ARTIFACT_ROOT, "test_results")
os.makedirs(OUT_DIR, exist_ok=True)

# API endpoint
API_URL = "http://127.0.0.1:8000/api/htr/recognize"

summary_rows = []

for filename, reference in GROUND_TRUTH.items():
    path = os.path.join(IMG_DIR, filename)
    # Prepare multipart request
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    with open(path, "rb") as f:
        file_data = f.read()
    data = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode('utf-8') + file_data + f"\r\n--{boundary}--\r\n".encode('utf-8')
    req = urllib.request.Request(API_URL, data=data)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    try:
        with urllib.request.urlopen(req) as resp:
            resp_bytes = resp.read()
            resp_json = json.loads(resp_bytes.decode('utf-8'))
    except Exception as e:
        print(f"Failed {filename}: {e}")
        continue
    # Save full JSON response
    json_path = os.path.join(OUT_DIR, f"{os.path.splitext(filename)[0]}_response.json")
    with open(json_path, "w", encoding='utf-8') as jf:
        json.dump(resp_json, jf, ensure_ascii=False, indent=2)
    # Save line crops if present
    line_imgs = resp_json.get('line_images', [])
    for idx, data_uri in enumerate(line_imgs, start=1):
        if data_uri.startswith('data:image/png;base64,'):
            b64 = data_uri.split(',', 1)[1]
            img_bytes = base64.b64decode(b64)
            img_path = os.path.join(OUT_DIR, f"{os.path.splitext(filename)[0]}_line{idx}.png")
            with open(img_path, 'wb') as imgf:
                imgf.write(img_bytes)
    # Compute metrics
    hypothesis = resp_json.get('text', '')
    # Normalize whitespace for metric calculation but keep punctuation/case
    cer_val = cer(reference, hypothesis)
    wer_val = wer(reference, hypothesis)
    expected_lines = reference.count('\n') + 1
    detected_lines = resp_json.get('line_count', None)
    fallback = resp_json.get('fallback', False)
    summary_rows.append({
        'filename': filename,
        'expected_lines': expected_lines,
        'detected_lines': detected_lines,
        'CER': f"{cer_val:.4f}",
        'WER': f"{wer_val:.4f}",
        'fallback': fallback,
    })
    print(f"Processed {filename}: CER={cer_val:.4f} WER={wer_val:.4f} lines={detected_lines}/{expected_lines} fallback={fallback}")

# Write summary CSV
csv_path = os.path.join(OUT_DIR, "summary.csv")
with open(csv_path, 'w', newline='', encoding='utf-8') as csvf:
    writer = csv.DictWriter(csvf, fieldnames=['filename','expected_lines','detected_lines','CER','WER','fallback'])
    writer.writeheader()
    for row in summary_rows:
        writer.writerow(row)

print("All done. Results stored in", OUT_DIR)
