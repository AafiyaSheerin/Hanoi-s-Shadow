# download_model.py  — replace the whole file with this
import urllib.request, os, sys, time

url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
dest = "hand_landmarker.task"

def progress(block, block_size, total):
    downloaded = block * block_size
    if total > 0:
        pct = downloaded / total * 100
        sys.stdout.write(f"\r{downloaded:,} / {total:,} bytes ({pct:.1f}%)")
        sys.stdout.flush()

print("Starting download...")
sys.stdout.flush()

try:
    urllib.request.urlretrieve(url, dest, reporthook=progress)
    print()
    size = os.path.getsize(dest)
    print(f"Final size: {size:,} bytes")
    if size > 20_000_000:
        print("SUCCESS!")
    else:
        print("INCOMPLETE — only got", size, "bytes")
except Exception as e:
    print(f"\nERROR: {e}")