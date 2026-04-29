// RunPod serverless adapter — calls the Docker worker in infra/runpod-worker.
//
// Architecture:
//   - The worker holds a warm pipeline (Flux Dev or Pony XL + a per-user LoRA).
//   - This adapter submits a job to /run, polls /status until COMPLETED,
//     and returns the URLs the worker uploaded to S3 (Wasabi / Bunny / B2).
//
// In production:
//   - Replace `mintLoraUrl` with a real presigner against your S3-compatible
//     bucket. The user's trained LoRA lives at e.g. `loras/<userId>/v1.safetensors`
//     and you mint a 5-minute presigned URL right before calling the worker.
//   - Move the polling loop off the request thread by using BullMQ +
//     RunPod webhooks. Their /run endpoint accepts a `webhook` field that
//     POSTs back when the job completes.

import type {
  GenerationProvider,
  GenerationRequest,
  GenerationResult,
  GeneratedAsset,
  ModerationResult,
} from "../types";

const POLL_INTERVAL_MS = 1_000;
const MAX_POLL_MS = 5 * 60_000; // 5 minutes — long enough for a cold start

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
  // TODO: parallel calls to Hive + Thorn Safer; fail closed if either errors.
  // Hive returns NSFW classification levels (we use them for tagging, not blocking).
  // Thorn Safer is the only hard block — CSAM-class detection ⇒ suspend account.
  return { ok: true };
}

interface RunPodJobOutput {
  images?: { url: string; key: string; seed: number; width: number; height: number }[];
  model?: string;
  model_type?: string;
  latency_ms?: number;
  error?: string;
}

interface RunPodStatus {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED" | "TIMED_OUT";
  output?: RunPodJobOutput;
  error?: unknown;
  delayTime?: number;
  executionTime?: number;
}

async function submit(input: object): Promise<RunPodJobOutput> {
  const endpoint = process.env.RUNPOD_ENDPOINT_ID;
  const key = process.env.RUNPOD_API_KEY;
  if (!endpoint || !key) {
    throw new Error("RUNPOD_ENDPOINT_ID + RUNPOD_API_KEY must be set");
  }

  const submitRes = await fetch(`https://api.runpod.ai/v2/${endpoint}/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });
  if (!submitRes.ok) {
    throw new Error(`runpod submit ${submitRes.status}: ${await submitRes.text()}`);
  }
  const { id } = (await submitRes.json()) as { id: string };

  // Poll for completion
  const start = Date.now();
  while (Date.now() - start < MAX_POLL_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const statusRes = await fetch(
      `https://api.runpod.ai/v2/${endpoint}/status/${id}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!statusRes.ok) {
      throw new Error(`runpod status ${statusRes.status}`);
    }
    const j = (await statusRes.json()) as RunPodStatus;
    if (j.status === "COMPLETED") {
      if (j.output?.error) throw new Error(`runpod worker: ${j.output.error}`);
      return j.output ?? {};
    }
    if (j.status === "FAILED" || j.status === "CANCELLED" || j.status === "TIMED_OUT") {
      throw new Error(`runpod ${j.status}: ${JSON.stringify(j.error ?? {})}`);
    }
  }
  throw new Error("runpod job timed out client-side");
}

/**
 * Mint a short-lived presigned URL for the user's LoRA. Replace this with a
 * real S3 presigner (Wasabi / Bunny / Backblaze B2 are all S3-compatible).
 *
 * Example with @aws-sdk/s3-request-presigner:
 *
 *   const command = new GetObjectCommand({
 *     Bucket: process.env.LORA_BUCKET,
 *     Key: `loras/${userId}/${modelId}.safetensors`,
 *   });
 *   return getSignedUrl(s3, command, { expiresIn: 300 });
 */
async function mintLoraUrl(_userId: string, _modelId: string): Promise<string | null> {
  const direct = process.env.RUNPOD_DEFAULT_LORA_URL;
  if (direct) return direct;
  // Without a presigner wired, the worker will run on the base model only.
  // That still works — the LoRA just won't be applied. Useful for smoke tests.
  return null;
}

async function generate(req: GenerationRequest): Promise<GenerationResult> {
  if (req.type === "video") {
    throw new Error("RunPod adapter is image-only; use Kling/fal for video");
  }

  const loraUrl = await mintLoraUrl(req.userId, req.modelId);
  const count = req.count ?? 4;

  const output = await submit({
    prompt: req.prompt,
    grade: req.grade,
    num_images: count,
    width: 1024,
    height: 1280,
    seed: 0,
    lora_url: loraUrl,
    lora_scale: 0.85,
    user_id: req.userId,
    job_id: `${req.packId}_${Date.now()}`,
    pack_id: req.packId,
  });

  if (!output.images?.length) {
    throw new Error("runpod returned no images");
  }

  const now = new Date().toISOString();
  const assets: GeneratedAsset[] = output.images.map((img, i) => ({
    id: `runpod-${Date.now()}-${i}`,
    url: img.url,
    type: "image" as const,
    mimeType: "image/png",
    width: img.width,
    height: img.height,
    exif: {
      aiGenerated: true,
      aiModel: output.model ?? "runpod-worker",
      prompt: req.prompt,
      grade: req.grade,
      sourceUserId: req.userId,
      createdAt: now,
    },
    // Real outputs use img.url; the `art` field is a leftover from the stub
    // for the placeholder UI. UI should prefer `url` when set.
    art: "bg-blush",
  }));

  return { assets, providerJobId: `runpod_${Date.now()}` };
}

export const runpodProvider: GenerationProvider = {
  name: "runpod",
  generate,
  preflightPrompt,
  postModerate,
};
