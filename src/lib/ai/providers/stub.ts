// Stub provider — used in demo / dev. Returns abstract gradient art and
// runs the same pre-flight + post-moderation guards real providers will run.
// Swap in fal.ai / Replicate / Kling / Veo by mirroring this surface.

import type {
  GenerationProvider,
  GenerationRequest,
  GenerationResult,
  GeneratedAsset,
  ModerationResult,
} from "../types";
import { getPack } from "../../packs";

// Patterns that must hard-fail BEFORE any inference. Cheap defense in depth —
// the real product also runs Hive's prompt classifier on top of this.
const PROMPT_HARDFAIL = [
  /\b(child|teen|minor|underage|young\s*girl|young\s*boy|loli|shota|preteen)\b/i,
  /\b(celebr(?:ity|ities)|taylor swift|ariana grande|kim kardashian|sydney sweeney)\b/i,
  /\b(deepfake|impersonat|nonconsensual|revenge porn)\b/i,
];

async function preflightPrompt(prompt: string): Promise<ModerationResult> {
  const reasons: string[] = [];
  for (const pat of PROMPT_HARDFAIL) {
    if (pat.test(prompt)) reasons.push(pat.source);
  }
  if (reasons.length) {
    return { ok: false, hardFail: true, reasons };
  }
  return { ok: true };
}

async function postModerate(_: GeneratedAsset[]): Promise<ModerationResult> {
  // In production: parallel calls to Hive Moderation + Thorn Safer.
  // Both must return clean. Either errors ⇒ fail closed.
  return { ok: true };
}

// Two gradient variants per pack — first half is the "feed" feel,
// second half is the "platform" feel (deeper saturation, darker glow).
const ART_BY_PACK: Record<string, string[]> = {
  boudoir: [
    "bg-[radial-gradient(120%_80%_at_30%_20%,#F8D7DA_0%,#E8A5B0_45%,#6B4F5E_100%)]",
    "bg-[radial-gradient(120%_80%_at_70%_30%,#FBF7F2_0%,#E8A5B0_55%,#6B4F5E_100%)]",
    "bg-[radial-gradient(120%_80%_at_50%_60%,#6B4F5E_0%,#D63384_55%,#1A0F1A_100%)]",
    "bg-[radial-gradient(120%_80%_at_60%_40%,#E8A5B0_0%,#6B4F5E_60%,#1A0F1A_100%)]",
  ],
  stage: [
    "bg-[radial-gradient(120%_80%_at_70%_30%,#D63384_0%,#1A0F1A_55%,#C9A961_120%)]",
    "bg-[radial-gradient(120%_80%_at_30%_30%,#1A0F1A_0%,#D63384_55%,#E8A5B0_120%)]",
    "bg-[radial-gradient(120%_80%_at_50%_70%,#1A0F1A_0%,#D63384_40%,#1A0F1A_100%)]",
    "bg-[radial-gradient(120%_80%_at_60%_50%,#D63384_0%,#1A0F1A_70%,#6B4F5E_120%)]",
  ],
  vacation: [
    "bg-[linear-gradient(160deg,#FBF7F2_0%,#E8D5B7_45%,#E8A5B0_100%)]",
    "bg-[linear-gradient(200deg,#E8D5B7_0%,#F8D7DA_45%,#FBF7F2_100%)]",
  ],
  editorial: [
    "bg-[radial-gradient(120%_80%_at_30%_30%,#FBF7F2_0%,#E8D5B7_55%,#C9A961_100%)]",
  ],
  "outfit-swap": [
    "bg-[conic-gradient(from_120deg_at_50%_50%,#F8D7DA,#E8D5B7,#FBF7F2,#E8A5B0,#F8D7DA)]",
    "bg-[conic-gradient(from_60deg_at_50%_50%,#6B4F5E,#D63384,#1A0F1A,#E8A5B0,#6B4F5E)]",
  ],
  "location-swap": [
    "bg-[linear-gradient(45deg,#1A0F1A_0%,#6B4F5E_50%,#F8D7DA_100%)]",
    "bg-[linear-gradient(45deg,#1A0F1A_0%,#D63384_60%,#6B4F5E_100%)]",
  ],
  video: [
    "bg-[radial-gradient(120%_80%_at_50%_50%,#1A0F1A_0%,#D63384_60%,#E8D5B7_120%)]",
    "bg-[radial-gradient(120%_80%_at_50%_50%,#1A0F1A_0%,#6B4F5E_50%,#D63384_100%)]",
  ],
};

function pickArt(packId: string, i: number, grade: "sfw" | "graded" = "sfw"): string {
  const pool = ART_BY_PACK[packId] ?? ART_BY_PACK.boudoir;
  // Different gradients for the two cuts so set members read as paired-but-different.
  const offset = grade === "graded" ? pool.length : 0;
  return pool[(i + offset) % pool.length]!;
}

async function generate(req: GenerationRequest): Promise<GenerationResult> {
  const pack = getPack(req.packId);
  const count = req.count ?? (req.type === "video" ? 1 : 4);
  const isVideo = req.type === "video" || pack?.id === "video";

  // Fake a realistic queue wait — feels like training, not synchronous text gen.
  await new Promise((r) => setTimeout(r, 850));

  const now = new Date().toISOString();

  const assets: GeneratedAsset[] = Array.from({ length: count }, (_, i) => ({
    id: `${req.packId}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
    url: "data:demo,placeholder",
    type: isVideo ? "video" : "image",
    mimeType: isVideo ? "video/mp4" : "image/jpeg",
    width: isVideo ? 1080 : 1024,
    height: isVideo ? 1920 : 1280,
    durationSec: isVideo ? 5 : undefined,
    exif: {
      aiGenerated: true,
      aiModel: "stub-v0",
      prompt: req.prompt,
      grade: req.grade,
      sourceUserId: req.userId,
      createdAt: now,
    },
    art: pickArt(req.packId, i, req.grade),
  }));

  return { assets, providerJobId: `stub_${Date.now()}` };
}

export const stubProvider: GenerationProvider = {
  name: "stub",
  generate,
  preflightPrompt,
  postModerate,
};
