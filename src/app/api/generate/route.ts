// POST /api/generate — pre-flight, generate, post-moderate, return assets.
// In production, also: enforce auth/session, charge credits server-side,
// enqueue via BullMQ rather than awaiting inline, and persist to Postgres + R2.

import { NextResponse } from "next/server";
import { getProvider } from "@/lib/ai";
import { getPack, type Grade } from "@/lib/packs";
import type { VaultItem } from "@/lib/state";

export const runtime = "nodejs";

type Body = {
  packId?: string;
  presetId?: string;
  prompt?: string;
  grade?: Grade;
  watermark?: VaultItem["watermark"];
  visibleAiBadge?: boolean;
};

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request body, love." }, { status: 400 });
  }

  const { packId, presetId, prompt, grade } = body;
  if (!packId || !presetId || !prompt || !grade) {
    return NextResponse.json({ ok: false, error: "Missing fields, darling." }, { status: 400 });
  }

  const pack = getPack(packId);
  if (!pack) {
    return NextResponse.json({ ok: false, error: "Pack not found." }, { status: 404 });
  }
  if (!pack.supports.includes(grade)) {
    return NextResponse.json(
      { ok: false, error: `${pack.name} doesn't ship a ${grade} channel.` },
      { status: 400 },
    );
  }

  const provider = getProvider();

  // Pre-flight: hard-fail on minor / celebrity / non-consensual prompts.
  const pre = await provider.preflightPrompt(prompt);
  if (!pre.ok) {
    // In production: write a moderation incident, suspend if hardFail.
    return NextResponse.json(
      {
        ok: false,
        error:
          "That prompt didn't sit right — we don't generate of anyone but you, gorgeous.",
        reasons: pre.reasons,
      },
      { status: 422 },
    );
  }

  // For the demo we don't have real auth; production reads userId/modelId from session.
  const result = await provider.generate({
    userId: "demo-user",
    modelId: "demo-model",
    prompt,
    packId,
    presetId,
    grade,
    watermark: body.watermark ?? "invisible",
    visibleAiBadge: body.visibleAiBadge ?? false,
    type: pack.id === "video" ? "video" : "image",
  });

  // Post-moderate: Hive + Thorn Safer parallel; fail closed on either error.
  const post = await provider.postModerate(result.assets);
  if (!post.ok) {
    return NextResponse.json(
      { ok: false, error: "Output didn't pass moderation. Try a different look, darling." },
      { status: 422 },
    );
  }

  // Map provider assets into client-shaped vault items.
  const items: VaultItem[] = result.assets.map((a) => ({
    id: a.id,
    packId,
    presetId,
    prompt,
    grade,
    createdAt: Date.now(),
    favorite: false,
    postedTo: [],
    art: a.art,
    watermark: body.watermark ?? "invisible",
    aiTagged: true,
    type: a.type,
  }));

  return NextResponse.json({ ok: true, items, providerJobId: result.providerJobId });
}
