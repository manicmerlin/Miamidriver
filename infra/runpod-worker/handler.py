"""La Di Da — RunPod serverless worker.

Runs once per container cold-start, then handles many requests warm. Loads
the base diffusion model at startup and applies the per-user LoRA on every
request.

Inputs (event["input"]):
    prompt:          str           (required)
    negative_prompt: str           (optional)
    num_images:      int           (default 4, max 8)
    width / height:  int           (default 1024 x 1280)
    seed:            int           (default random)
    lora_url:        str           (optional, presigned URL to user's LoRA)
    lora_scale:      float         (default 0.85)
    guidance_scale:  float         (default 3.5 flux, 7.5 sdxl)
    steps:           int           (default 28 flux, 30 sdxl)
    user_id:         str           (used in the upload key)
    job_id:          str           (used in the upload key)
    grade:           "sfw"|"graded" (only affects negative-prompt defaults)
    pack_id:         str           (informational, baked into EXIF metadata)

Output:
    {
      "images": [{"url": "...", "key": "...", "seed": int, "width", "height"}],
      "model": "...",
    }
"""
import os
import io
import time
import hashlib
import logging
import requests
import torch
import boto3
import runpod
from PIL import Image
from PIL.PngImagePlugin import PngInfo

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(message)s")
log = logging.getLogger("ladida")

MODEL_ID = os.getenv("MODEL_ID", "black-forest-labs/FLUX.1-dev")
MODEL_TYPE = os.getenv("MODEL_TYPE", "flux")  # flux | sdxl

# S3-compatible storage (Wasabi / Bunny / Backblaze B2 / DigitalOcean Spaces)
S3_ENDPOINT = os.environ["S3_ENDPOINT_URL"]
S3_BUCKET = os.environ["S3_BUCKET"]
S3_REGION = os.getenv("S3_REGION", "auto")
S3_KEY = os.environ["S3_ACCESS_KEY_ID"]
S3_SECRET = os.environ["S3_SECRET_ACCESS_KEY"]
S3_PUBLIC_URL = os.environ["S3_PUBLIC_URL"]  # e.g. https://cdn.ladida.studio

DEFAULT_NEG_SFW = (
    "nsfw, nudity, nipples, areola, exposed breast, exposed genitals, "
    "explicit, lingerie, swimwear malfunction, low quality, bad anatomy"
)
DEFAULT_NEG_GRADED = "low quality, bad anatomy, distorted, watermark, text"

# ─── load pipeline once on cold start ────────────────────────────────────────

log.info(f"loading {MODEL_ID} ({MODEL_TYPE})...")
t0 = time.time()
if MODEL_TYPE == "flux":
    from diffusers import FluxPipeline
    pipe = FluxPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16)
else:
    from diffusers import StableDiffusionXLPipeline
    pipe = StableDiffusionXLPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.float16)
pipe = pipe.to("cuda")
pipe.set_progress_bar_config(disable=True)
log.info(f"loaded in {time.time() - t0:.1f}s")

# S3 client
s3 = boto3.client(
    "s3",
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_KEY,
    aws_secret_access_key=S3_SECRET,
    region_name=S3_REGION,
)

# LoRA cache — bounded LRU, keyed by URL hash. Caps at ~5GB by default.
LORA_CACHE: dict[str, str] = {}
LORA_CACHE_DIR = "/tmp/loras"
LORA_CACHE_MAX = int(os.getenv("LORA_CACHE_MAX", "20"))
os.makedirs(LORA_CACHE_DIR, exist_ok=True)


def _evict_lora_cache():
    if len(LORA_CACHE) <= LORA_CACHE_MAX:
        return
    oldest = next(iter(LORA_CACHE))
    path = LORA_CACHE.pop(oldest)
    try:
        os.remove(path)
    except OSError:
        pass


def fetch_lora(url: str) -> str:
    """Download a LoRA from a presigned URL, cache locally, return the path."""
    if url in LORA_CACHE:
        return LORA_CACHE[url]
    digest = hashlib.sha256(url.encode()).hexdigest()[:16]
    local = f"{LORA_CACHE_DIR}/{digest}.safetensors"
    if not os.path.exists(local):
        log.info(f"downloading LoRA {digest}...")
        r = requests.get(url, stream=True, timeout=60)
        r.raise_for_status()
        with open(local, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 16):
                f.write(chunk)
    LORA_CACHE[url] = local
    _evict_lora_cache()
    return local


def upload_image(img: Image.Image, key: str, exif: dict) -> str:
    """Save with AI-disclosure metadata baked into PNG/JPEG EXIF."""
    buf = io.BytesIO()
    # Use PNG for the AI metadata block. JPEGs strip a lot of metadata in
    # transit, so we keep PNG for graded outputs and let the API layer
    # transcode-with-EXIF for delivery.
    info = PngInfo()
    for k, v in exif.items():
        info.add_text(str(k), str(v))
    img.save(buf, format="PNG", pnginfo=info, optimize=True)
    buf.seek(0)
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=buf,
        ContentType="image/png",
        Metadata={k: str(v) for k, v in exif.items()},
    )
    return f"{S3_PUBLIC_URL}/{key}"


def handler(event):
    inp = event["input"]
    prompt = inp["prompt"]
    grade = inp.get("grade", "sfw")
    negative_prompt = inp.get("negative_prompt") or (
        DEFAULT_NEG_SFW if grade == "sfw" else DEFAULT_NEG_GRADED
    )
    num_images = max(1, min(int(inp.get("num_images", 4)), 8))
    width = int(inp.get("width", 1024))
    height = int(inp.get("height", 1280))
    seed_in = int(inp.get("seed", 0))
    seed = seed_in or torch.Generator(device="cuda").seed()
    steps = int(inp.get("steps", 28 if MODEL_TYPE == "flux" else 30))
    guidance = float(inp.get("guidance_scale", 3.5 if MODEL_TYPE == "flux" else 7.5))
    lora_url = inp.get("lora_url")
    lora_scale = float(inp.get("lora_scale", 0.85))
    user_id = inp.get("user_id", "anon")
    job_id = inp.get("job_id", f"job_{int(time.time())}")
    pack_id = inp.get("pack_id", "unknown")

    t0 = time.time()
    lora_loaded = False
    if lora_url:
        try:
            lora_path = fetch_lora(lora_url)
            pipe.load_lora_weights(lora_path, adapter_name="user")
            pipe.set_adapters(["user"], adapter_weights=[lora_scale])
            lora_loaded = True
        except Exception as e:
            log.exception(f"LoRA load failed: {e}")
            return {"error": f"lora-load-failed: {e}"}

    try:
        gen = torch.Generator(device="cuda").manual_seed(seed)
        kwargs = dict(
            prompt=prompt,
            num_images_per_prompt=num_images,
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=guidance,
            generator=gen,
        )
        if MODEL_TYPE == "sdxl":
            kwargs["negative_prompt"] = negative_prompt
        results = pipe(**kwargs).images
    finally:
        if lora_loaded:
            pipe.unload_lora_weights()

    log.info(f"inference: {time.time() - t0:.1f}s for {num_images} images")

    # Upload + return URLs
    out = []
    now = int(time.time())
    for i, img in enumerate(results):
        key = f"generations/{user_id}/{job_id}/{i:02d}.png"
        exif = {
            "ai_generated": "true",
            "ai_model": MODEL_ID,
            "prompt": prompt[:512],
            "grade": grade,
            "pack_id": pack_id,
            "user_id": user_id,
            "seed": seed + i,
            "created_at": now,
        }
        try:
            url = upload_image(img, key, exif)
        except Exception as e:
            log.exception(f"upload failed: {e}")
            return {"error": f"upload-failed: {e}"}
        out.append({"url": url, "key": key, "seed": seed + i, "width": width, "height": height})

    return {
        "images": out,
        "model": MODEL_ID,
        "model_type": MODEL_TYPE,
        "latency_ms": int((time.time() - t0) * 1000),
    }


runpod.serverless.start({"handler": handler})
