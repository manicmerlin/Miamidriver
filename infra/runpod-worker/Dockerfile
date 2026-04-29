# La Di Da — RunPod serverless worker
# Builds an image that bakes the base diffusion model, then runs handler.py
# under runpod.serverless.

FROM runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Bake the base model into the image so cold start is fast ──
# Choose flux for prosumer / SFW work; switch to sdxl + Pony XL for explicit work.
ARG MODEL_ID=black-forest-labs/FLUX.1-dev
ARG MODEL_TYPE=flux
ARG HF_TOKEN
ENV MODEL_ID=${MODEL_ID} \
    MODEL_TYPE=${MODEL_TYPE} \
    HF_TOKEN=${HF_TOKEN} \
    HF_HOME=/root/.cache/huggingface

COPY download_models.py .
RUN python download_models.py

COPY handler.py .

CMD ["python", "-u", "handler.py"]
