import requests, json, os

def test_personality():
    url = 'http://127.0.0.1:8000/api/analyze-personality'
    img_path = os.path.expanduser('C:/Users/HP/.gemini/antigravity/scratch/graphvision-ai/sample_handwriting.jpg')
    if not os.path.isfile(img_path):
        print('Image not found')
        return
    with open(img_path, 'rb') as f:
        files = {'file': f}
        resp = requests.post(url, files=files)
    print('personality status', resp.status_code)
    try:
        print('response', resp.json())
    except Exception:
        print('text', resp.text)

def test_signature():
    status_url = 'http://127.0.0.1:8000/api/signature/status'
    r = requests.get(status_url)
    print('signature status code', r.status_code)
    try:
        print('status resp', r.json())
    except Exception:
        print('status text', r.text)
    # Verify endpoint expects multipart file with signature image and maybe other fields; we'll just call GET if exists
    verify_url = 'http://127.0.0.1:8000/api/signature/verify'
    # Assuming it needs POST with file; using same image
    with open(img_path, 'rb') as f:
        files = {'file': f}
        r2 = requests.post(verify_url, files=files)
    print('signature verify code', r2.status_code)
    try:
        print('verify resp', r2.json())
    except Exception:
        print('verify text', r2.text)

if __name__ == '__main__':
    test_personality()
    test_signature()
