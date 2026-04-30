// fal.ai adapter — Flux LoRA inference for stills, Kling for video.
//
// Uses fal's queue API (submit → poll → fetch result) rather than the sync
// endpoints, so we don't tie up the Next.js request thread on cold starts
// or long video jobs.
//
// fal endpoints used:
//   stills (with user LoRA):  fal-ai/flux-lora                — apply a
//                              user's trained LoRA to Flux dev/schnell.
//   stills (no LoRA, fallback): fal-ai/flux/dev               — bare Flux.
//   training:                  fal-ai/flux-lora-fast-training — train a LoRA
//                              from a zip of the user's selfies.
//   video:                     fal-ai/kling-video/v1/standard/text-to-video
//
// For verified-self adult use, fal allows the safety_checker to be set false.
// Per-pack routing (which endpoint, which grade) lives in src/lib/ai/router.ts.

import type {
  GenerationProvider,
  GenerationRequest,
  GenerationResult,
  GeneratedAsset,
  ModerationResult,
} from "../types";

const FAL_QUEUE = "https://queue.fal.run";
const POLL_INTERVAL_MS = 1_500;
const MAX_POLL_MS = 5 * 60_000;

const PROMPT_HARDFAIL = [
  /\b(child|teen|minor|underage|young\s*girl|young\s*boy|loli|shota|preteen)\b/i,
  /\b(celebr(?:ity|ities)|deepfake|nonconsensual|revenge porn)\b/i,
];

async function preflightPrompt(prompt: string): Promise<ModerationResult> {
  const reasons: string[] = [];
  for (const p of PROMPT_HARDFAIL) if (p.test(prompt)) reasons.push(p.source);
  if (reasons.length) return { ok: false, hardFail: true, reasons };
  return { ok: true };
}

async function postModerate(_assets: GeneratedAsset[]): Promise<ModerationResult> {
  // TODO: Hive + Thorn Safer in parallel; fail closed on either error.
  return { ok: true };
}

function falKey() {
  // fal's docs name the env var FAL_KEY; our scaffold uses FAL_API_KEY.
  // Accept either so people who copy-paste from fal's docs aren't tripped up.
  const key = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
  if (!key) {
    throw new Error("FAL_KEY (or FAL_API_KEY) missing — set it or switch AI_PROVIDER=stub");
  }
  if (!key.includes(":")) {
    throw new Error(
      "FAL_KEY looks malformed — expected '<key_id>:<key_secret>' (one colon, two halves)",
    );
  }
  return key;
}

interface FalQueueResponse {
  status_url: string;
  response_url: string;
  request_id: string;
}

interface FalStatus {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  logs?: { message: string }[];
}

async function falSubmit<T>(endpoint: string, input: object): Promise<T> {
  const key = falKey();

  // Submit
  const submit = await fetch(`${FAL_QUEUE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!submit.ok) {
    throw new Error(`fal submit ${submit.status}: ${await submit.text()}`);
  }
  const queued = (await submit.json()) as FalQueueResponse;

  // Poll
  const start = Date.now();
  while (Date.now() - start < MAX_POLL_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const stat = await fetch(queued.status_url, {
      headers: { Authorization: `Key ${key}` },
    });
    if (!stat.ok) throw new Error(`fal status ${stat.status}`);
    const j = (await stat.json()) as FalStatus;
    if (j.status === "COMPLETED") {
      const out = await fetch(queued.response_url, {
        headers: { Authorization: `Key ${key}` },
      });
      if (!out.ok) throw new Error(`fal response ${out.status}`);
      return (await out.json()) as T;
    }
    if (j.status === "FAILED") {
      throw new Error(`fal job failed: ${j.logs?.map((l) => l.message).join("; ")}`);
    }
  }
  throw new Error("fal job timed out");
}

interface FluxResponse {
  images: { url: string; width: number; height: number }[];
  seed: number;
  has_nsfw_concepts?: boolean[];
}

interface KlingResponse {
  video: { url: string };
}

async function generate(req: GenerationRequest): Promise<GenerationResult> {
  const isVideo = req.type === "video";
  const count = req.count ?? (isVideo ? 1 : 4);
  const loraUrl = await mintLoraUrl(req.userId, req.modelId);
  const now = new Date().toISOString();

  if (isVideo) {
    const out = await falSubmit<KlingResponse>(
      "fal-ai/kling-video/v1/standard/text-to-video",
      {
        prompt: req.prompt,
        duration: "5",
        aspect_ratio: "9:16",
      },
    );
    return {
      assets: [
        {
          id: `fal-${Date.now()}-0`,
          url: out.video.url,
          type: "video",
          mimeType: "video/mp4",
          width: 1080,
          height: 1920,
          durationSec: 5,
          exif: {
            aiGenerated: true,
            aiModel: "kling-v1",
            prompt: req.prompt,
            grade: req.grade,
            sourceUserId: req.userId,
            createdAt: now,
          },
          art: "bg-blush",
        },
      ],
    };
  }

  // Stills — use flux-lora when we have a user LoRA, plain flux otherwise.
  const endpoint = loraUrl ? "fal-ai/flux-lora" : "fal-ai/flux/dev";
  const negative =
    req.grade === "sfw"
      ? "nsfw, nudity, exposed breast, exposed genitals, lingerie malfunction"
      : "low quality, bad anatomy, distorted, watermark, text";

  const input: Record<string, unknown> = {
    prompt: req.prompt,
    negative_prompt: negative,
    num_images: count,
    image_size: { width: 1024, height: 1280 },
    num_inference_steps: 28,
    guidance_scale: 3.5,
    enable_safety_checker: req.grade === "sfw",
  };
  if (loraUrl) {
    input.loras = [{ path: loraUrl, scale: 0.85 }];
  }

  const out = await falSubmit<FluxResponse>(endpoint, input);

  const assets: GeneratedAsset[] = out.images.map((img, i) => ({
    id: `fal-${Date.now()}-${i}`,
    url: img.url,
    type: "image" as const,
    mimeType: "image/jpeg",
    width: img.width,
    height: img.height,
    exif: {
      aiGenerated: true,
      aiModel: loraUrl ? "flux-lora" : "flux-dev",
      prompt: req.prompt,
      grade: req.grade,
      sourceUserId: req.userId,
      createdAt: now,
    },
    art: "bg-blush",
  }));

  return { assets };
}

/**
 * Resolve the user's trained LoRA URL.
 *
 * Production flow:
 *   1. After /api/train completes, the resulting `.safetensors` is uploaded
 *      to S3 at e.g. s3://ladida-prod/loras/<userId>/<modelId>.safetensors.
 *   2. Right before generate(), mint a 5-minute presigned URL.
 *   3. Pass it to fal as the LoRA path; fal pulls it once and caches.
 *
 * Demo fallback:
 *   FAL_DEFAULT_LORA_URL — point at a public test LoRA so generations
 *   still work end-to-end without the presigner wired.
 */
async function mintLoraUrl(_userId: string, _modelId: string): Promise<string | null> {
  return process.env.FAL_DEFAULT_LORA_URL ?? null;
}

/**
 * Kick off LoRA training on fal-ai/flux-lora-fast-training.
 *
 * Expects `images_data_url` to be a public/presigned URL to a zip of 20–30
 * selfies. Returns a training-job id that you poll separately to know when
 * the LoRA is ready (the resulting `.safetensors` URL is in the response).
 */
export async function trainLora(input: {
  imagesZipUrl: string;
  triggerWord: string; // unique token e.g. "vivienne_sks_v1"
  steps?: number;
}) {
  const key = falKey();
  const submit = await fetch(`${FAL_QUEUE}/fal-ai/flux-lora-fast-training`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      images_data_url: input.imagesZipUrl,
      trigger_word: input.triggerWord,
      steps: input.steps ?? 1_000,
      create_masks: true,
      is_style: false,
    }),
  });
  if (!submit.ok) {
    throw new Error(`fal training submit ${submit.status}: ${await submit.text()}`);
  }
  return (await submit.json()) as FalQueueResponse;
}

export const falProvider: GenerationProvider = {
  name: "fal",
  generate,
  preflightPrompt,
  postModerate,
};
