"""Pre-fetch the base diffusion model into the image so cold start is fast.

Runs at Docker build time. The model is baked in once; per-user LoRAs are
loaded at request time from a presigned S3 URL.
"""
import os
import torch

MODEL_ID = os.getenv("MODEL_ID", "black-forest-labs/FLUX.1-dev")
MODEL_TYPE = os.getenv("MODEL_TYPE", "flux")  # flux | sdxl

if MODEL_TYPE == "flux":
    from diffusers import FluxPipeline
    FluxPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16)
else:
    from diffusers import StableDiffusionXLPipeline
    StableDiffusionXLPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.float16)

print(f"baked: {MODEL_ID} ({MODEL_TYPE})")
