// Provider registry — pick the active GenerationProvider based on env.
// Never hardcode a provider in route handlers; always import `provider` from here.

import type { GenerationProvider } from "./types";
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

export function getProvider(): GenerationProvider {
  const name = (process.env.AI_PROVIDER ?? "stub").toLowerCase();
  return REGISTRY[name] ?? stubProvider;
}

export type { GenerationProvider } from "./types";
