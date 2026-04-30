// Per-pack / per-grade provider routing.
//
// AI_PROVIDER controls the global default (stub | fal | replicate | runpod).
// AI_ROUTING is an optional JSON object that overrides the default for
// specific pack/grade combinations:
//
//   AI_ROUTING='{"sfw":"fal","graded":"runpod","video":"fal"}'
//
//   keys (in this order of priority):
//     "<packId>:<grade>"  e.g. "boudoir:graded"  — most specific
//     "<packId>"          e.g. "boudoir"          — pack-wide
//     "<grade>"           e.g. "graded"           — grade-wide
//     "video"                                     — any video request
//     "default"                                   — final fallback
//
// Recommended starting setup once you have keys:
//   AI_PROVIDER=fal                 # SFW + light-graded work goes here
//   AI_ROUTING='{"graded":"runpod","video":"fal"}'  # explicit ⇒ self-host

import type { GenerationProvider } from "./types";
import type { Grade } from "../packs";
import { stubProvider } from "./providers/stub";
import { falProvider } from "./providers/fal";
import { replicateProvider } from "./providers/replicate";
import { runpodProvider } from "./providers/runpod";

const REGISTRY: Record<string, GenerationProvider> = {
  stub: stubProvider,
  fal: falProvider,
  replicate: replicateProvider,
  runpod: runpodProvider,
};

interface RouteContext {
  packId: string;
  grade: Grade;
  type: "image" | "video";
}

let cachedRouting: Record<string, string> | null | undefined;

function loadRouting(): Record<string, string> | null {
  if (cachedRouting !== undefined) return cachedRouting;
  const raw = process.env.AI_ROUTING;
  if (!raw) {
    cachedRouting = null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    cachedRouting = parsed;
    return parsed;
  } catch {
    console.warn("[ai/router] AI_ROUTING is not valid JSON; ignoring");
    cachedRouting = null;
    return null;
  }
}

export function pickProvider(ctx: RouteContext): GenerationProvider {
  const routing = loadRouting();
  const fallback = (process.env.AI_PROVIDER ?? "stub").toLowerCase();

  const candidates = [
    `${ctx.packId}:${ctx.grade}`,
    ctx.packId,
    ctx.grade,
    ctx.type,
    "default",
  ];

  if (routing) {
    for (const key of candidates) {
      const name = routing[key];
      if (name && REGISTRY[name]) return REGISTRY[name];
    }
  }

  return REGISTRY[fallback] ?? stubProvider;
}

// Kept for backward compat with anything that still imports getProvider().
export function getProvider(): GenerationProvider {
  const name = (process.env.AI_PROVIDER ?? "stub").toLowerCase();
  return REGISTRY[name] ?? stubProvider;
}

export type { GenerationProvider } from "./types";
