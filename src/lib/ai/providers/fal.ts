// fal.ai adapter (Flux + InstantID for stills, Kling 3.0 for video).
// This file is a thin scaffold — fill the fetch URLs and request payloads when
// you wire keys. The shape conforms to GenerationProvider so the route handlers
// stay identical.

import type {
  GenerationProvider,
  GenerationRequest,
  GenerationResult,
  GeneratedAsset,
  ModerationResult,
} from "../types";

const FAL_BASE = "https://fal.run";

async function preflightPrompt(prompt: string): Promise<ModerationResult> {
  // Reuse the stub's regex baseline; production also calls Hive's prompt API here.
  const banned = /\b(child|teen|minor|underage|celebrity|deepfake|nonconsensual)\b/i;
  if (banned.test(prompt)) return { ok: false, hardFail: true, reasons: ["banned-term"] };
  return { ok: true };
}

async function postModerate(_assets: GeneratedAsset[]): Promise<ModerationResult> {
  // TODO: call Hive Moderation + Thorn Safer in parallel, fail closed on either error.
  return { ok: true };
}

async function generate(req: GenerationRequest): Promise<GenerationResult> {
  const key = process.env.FAL_API_KEY;
  if (!key) {
    throw new Error("FAL_API_KEY missing — set it or switch AI_PROVIDER=stub");
  }

  const isVideo = req.type === "video";
  const endpoint = isVideo ? "fal-ai/kling-video/v1/standard/text-to-video" : "fal-ai/flux/dev";

  const res = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: req.prompt,
      // TODO: thread req.modelId (LoRA reference) through the InstantID adapter
      num_images: req.count ?? (isVideo ? 1 : 4),
      // graded outputs add a NSFW-allowed pipeline; SFW uses the safety pipeline
      enable_safety_checker: req.grade === "sfw",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fal error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { images?: { url: string }[]; video?: { url: string } };
  const now = new Date().toISOString();

  const assets: GeneratedAsset[] = (
    isVideo
      ? [{ url: json.video?.url ?? "" }]
      : (json.images ?? []).map((i) => ({ url: i.url }))
  ).map((a, i) => ({
    id: `fal-${Date.now()}-${i}`,
    url: a.url,
    type: isVideo ? "video" : "image",
    mimeType: isVideo ? "video/mp4" : "image/jpeg",
    width: isVideo ? 1080 : 1024,
    height: isVideo ? 1920 : 1280,
    durationSec: isVideo ? 5 : undefined,
    exif: {
      aiGenerated: true,
      aiModel: isVideo ? "kling-3.0" : "flux-instantid",
      prompt: req.prompt,
      grade: req.grade,
      sourceUserId: req.userId,
      createdAt: now,
    },
    art: "bg-blush", // unused for real outputs — UI shows the URL
  }));

  return { assets };
}

export const falProvider: GenerationProvider = {
  name: "fal",
  generate,
  preflightPrompt,
  postModerate,
};
