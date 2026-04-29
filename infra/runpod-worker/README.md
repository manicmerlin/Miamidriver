# La Di Da — RunPod Serverless Worker

A Dockerized GPU worker that runs Flux / Pony Diffusion XL with the user's
trained LoRA, uploads outputs to your S3-compatible bucket, and returns URLs.
The Next.js adapter at `src/lib/ai/providers/runpod.ts` calls into this.

## Why self-host

Most hosted providers (fal.ai, Replicate) work for SFW + tasteful graded
work. RunPod is the escape hatch: you control the model, the moderation,
and the bill. Use it for fully uncensored Pony XL or custom fine-tunes,
or as a cost backstop at high volume.

## What this image does

1. On cold start: loads the base diffusion model into GPU memory once.
2. On each request:
   - Pulls the user's LoRA from a presigned URL, caches it on the SSD.
   - Applies the LoRA at the requested scale, runs inference.
   - Uploads each PNG to S3 with AI-disclosure metadata baked in.
   - Returns the public URLs to the Next.js app.

## 0 — prerequisites

- A RunPod account (https://runpod.io). Add ~$10 credit to start.
- A Hugging Face account with a token (for gated models like FLUX.1-dev).
- An S3-compatible bucket (recommended: **Wasabi** — adult-friendly AUP,
  cheapest in the category). Bunny Storage and Backblaze B2 also work.
- Docker installed locally (only needed if you want to build the image
  yourself; otherwise use RunPod's GitHub auto-build).

## 1 — pick the model

Edit the `Dockerfile` `ARG` defaults (or pass at build):

| Use case | `MODEL_TYPE` | `MODEL_ID` |
| --- | --- | --- |
| Default — Flux Dev (best identity, allows tasteful nude with LoRA) | `flux` | `black-forest-labs/FLUX.1-dev` |
| Faster + cheaper — Flux Schnell | `flux` | `black-forest-labs/FLUX.1-schnell` |
| Fully uncensored explicit — Pony Diffusion XL | `sdxl` | `John6666/pony-diffusion-v6-xl-sdxl` |
| Photorealistic NSFW — Realistic Vision XL | `sdxl` | `SG161222/RealVisXL_V4.0` |

Flux is the prosumer default — better skin/hands/identity. Pony XL is the
NSFW workhorse. You can deploy two endpoints and route by user pack/grade.

## 2 — build & push the image

Two paths:

### Option A — RunPod GitHub auto-build (easiest)

1. Push this repo to GitHub.
2. RunPod → Serverless → New Endpoint → "GitHub Repo" → select repo,
   set **Container Disk Path** to `/app`, **Build Context** to
   `infra/runpod-worker`. RunPod builds on every push.

### Option B — local build → Docker Hub

```bash
cd infra/runpod-worker

# Build (Pony XL example)
docker build \
  --build-arg MODEL_ID=John6666/pony-diffusion-v6-xl-sdxl \
  --build-arg MODEL_TYPE=sdxl \
  --build-arg HF_TOKEN=hf_xxxxxxxxxxxxx \
  -t YOURUSER/ladida-worker:pony-v1 .

# Push
docker push YOURUSER/ladida-worker:pony-v1
```

## 3 — create the RunPod endpoint

1. RunPod → Serverless → New Endpoint.
2. **Container Image:** `YOURUSER/ladida-worker:pony-v1` (or the GitHub link).
3. **GPU type:** `NVIDIA A40` is the cost-sweet-spot (~$0.45/hr, ~6s per Flux
   image). For SDXL, an `RTX 4090` is faster. Avoid H100s for stills.
4. **Container Disk:** 30 GB.
5. **Min workers:** 0 for development, 1+ for paid tiers (kills cold start).
6. **Max workers:** 4 to start, raise as load demands.
7. **Request timeout:** 300 seconds.
8. **Flashboot:** ON (speeds cold start).
9. **Environment Variables — paste these in:**

| Name | Value |
| --- | --- |
| `MODEL_ID` | matches the build arg |
| `MODEL_TYPE` | `flux` or `sdxl` |
| `S3_ENDPOINT_URL` | `https://s3.wasabisys.com` (or Bunny / B2) |
| `S3_REGION` | `us-east-1` (Wasabi default) |
| `S3_BUCKET` | your bucket name |
| `S3_ACCESS_KEY_ID` | from your storage provider |
| `S3_SECRET_ACCESS_KEY` | from your storage provider |
| `S3_PUBLIC_URL` | `https://cdn.ladida.studio` (your CDN pull zone) |
| `LORA_CACHE_MAX` | `20` (number of cached LoRAs on the worker SSD) |

Hit **Deploy**. Copy the **Endpoint ID** and the **API Key**.

## 4 — connect the Next.js app

In `.env.local` of the Next.js project:

```
AI_PROVIDER=runpod
RUNPOD_ENDPOINT_ID=xxxxxxxxxxxxx
RUNPOD_API_KEY=xxxxxxxxxxxxxxx

# For smoke-testing without the LoRA presigner wired, point at a test LoRA:
RUNPOD_DEFAULT_LORA_URL=https://huggingface.co/.../yourtest.safetensors
```

Restart `npm run dev`. `/api/generate` now hits your RunPod worker. The
result tiles in `/atelier/generate/...` and `/vault` will render the
real PNGs from your CDN.

## 5 — wire the LoRA presigner (production)

The placeholder `mintLoraUrl()` in `src/lib/ai/providers/runpod.ts` returns
the demo URL. In production, mint a 5-minute presigned URL right before
calling the worker, so each user's LoRA stays private:

```ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT_URL,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

async function mintLoraUrl(userId: string, modelId: string) {
  const cmd = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: `loras/${userId}/${modelId}.safetensors`,
  });
  return getSignedUrl(s3, cmd, { expiresIn: 300 });
}
```

## 6 — what's NOT in this worker yet (intentional)

- **LoRA training.** Cheaper to use fal.ai (`flux-lora-fast-training`) for
  the initial training run, then store the resulting `.safetensors` in
  your bucket. Worth ~$2 per user; infrastructure-wise much simpler than
  running training on RunPod yourself.
- **Hive + Thorn Safer post-output moderation.** Add inside the Next.js
  adapter (`postModerate`), not the worker — keeps the GPU container
  small and lets you change moderation providers without rebuilding.
- **Video.** Use Kling 3.0 via fal.ai for stylized clips. Self-host
  Hunyuan Video or Wan 2.1 on a separate RunPod endpoint when you're
  ready — same pattern as this worker, different model and a longer
  request timeout.

## Cost rough math

| Pack | Wholesale cost (RunPod A40) | Retail credit cost | Margin |
| --- | --- | --- | --- |
| Flux Dev image (1024x1280, 28 steps) | ~$0.005 | 1 credit ≈ $0.10 | ~95% |
| Pony XL image (SDXL, 30 steps) | ~$0.003 | 1 credit ≈ $0.10 | ~97% |
| Cold start | ~$0.04 | absorbed by min-workers ≥ 1 | — |

## Troubleshooting

**Cold start > 60s:** baked the wrong model size. Flux Dev is 23 GB; using
`from_pretrained` with `torch_dtype=torch.bfloat16` gets it to ~12 GB
which fits comfortably on an A40 at startup.

**`HTTPError 401` when downloading the model:** missing `HF_TOKEN` build
arg. The Flux family is gated.

**LoRA download timeout:** worker has a 60s download timeout per LoRA.
For LoRAs over 200 MB, raise `LORA_CACHE_MAX` and pre-warm the cache
with the most-used user models on container startup.

**Worker upload fails with 403:** Wasabi / B2 bucket policies. Make sure
the access key has `s3:PutObject` on the bucket and your CDN pull zone
points at the right origin.
