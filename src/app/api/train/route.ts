// POST /api/train — start LoRA training on uploaded selfies.
// In production: validate ID-verified user, push N images to R2, kick off
// a fal.ai LoRA training job, persist trainingJobId, stream progress via SSE.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  // Demo: pretend a training job kicked off.
  return NextResponse.json({
    ok: true,
    trainingJobId: `train_${Date.now()}`,
    estimatedSeconds: 480, // ~8 minutes
  });
}
