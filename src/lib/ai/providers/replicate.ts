// Replicate adapter — fallback for Flux variants and SDXL.
// Same shape as fal.ts. Fill in when you wire REPLICATE_API_TOKEN.

import type {
  GenerationProvider,
  GenerationRequest,
  GenerationResult,
  GeneratedAsset,
  ModerationResult,
} from "../types";

async function preflightPrompt(prompt: string): Promise<ModerationResult> {
  const banned = /\b(child|teen|minor|underage|celebrity|deepfake|nonconsensual)\b/i;
  if (banned.test(prompt)) return { ok: false, hardFail: true, reasons: ["banned-term"] };
  return { ok: true };
}

async function postModerate(_: GeneratedAsset[]): Promise<ModerationResult> {
  return { ok: true };
}

async function generate(req: GenerationRequest): Promise<GenerationResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN missing");

  // TODO: choose model version per pack/grade.
  // const version = req.grade === "graded" ? "<flux-uncensored>" : "<flux-dev>";
  const _ = req;
  throw new Error("Replicate adapter not implemented — switch AI_PROVIDER=stub or fal");
}

export const replicateProvider: GenerationProvider = {
  name: "replicate",
  generate,
  preflightPrompt,
  postModerate,
};
