// Provider-agnostic generation interface.
// Implementations live in `./providers/<name>.ts` and conform to GenerationProvider.
// Pick the active one in `./index.ts` based on env.AI_PROVIDER.

import type { Grade } from "../packs";

export interface GenerationRequest {
  userId: string;            // verified user id (from auth/session)
  modelId: string;            // user's trained LoRA id (gates against impersonation)
  prompt: string;
  packId: string;
  presetId: string;
  grade: Grade;
  watermark: "invisible" | "visible-corner" | "off";
  visibleAiBadge: boolean;
  count?: number;             // default 4 still images, 1 video
  type?: "image" | "video";
  videoEngine?: "kling" | "veo_lite";
}

export interface GeneratedAsset {
  id: string;
  url: string;                // R2/S3 URL in production; data: url in stub
  type: "image" | "video";
  mimeType: string;
  width: number;
  height: number;
  durationSec?: number;
  exif: {
    aiGenerated: true;
    aiModel: string;
    prompt: string;
    grade: Grade;
    sourceUserId: string;
    createdAt: string;
  };
  // Used by the demo UI as a placeholder gradient
  art: string;
}

export interface GenerationResult {
  assets: GeneratedAsset[];
  providerJobId?: string;
}

export interface ModerationResult {
  ok: boolean;
  hardFail?: boolean;          // true ⇒ suspend account, do not retry
  reasons?: string[];
}

export interface GenerationProvider {
  name: string;
  generate(req: GenerationRequest): Promise<GenerationResult>;
  /**
   * Pre-flight prompt classifier. MUST hard-fail any minor-adjacent,
   * celebrity, or non-self likeness language before any inference is run.
   */
  preflightPrompt(prompt: string): Promise<ModerationResult>;
  /**
   * Post-output moderation. MUST run Hive + Thorn Safer (or equivalent).
   * Fails closed: if either provider errors, the result is suppressed.
   */
  postModerate(assets: GeneratedAsset[]): Promise<ModerationResult>;
}
