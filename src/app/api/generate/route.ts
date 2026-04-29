// POST /api/generate — pre-flight, generate, post-moderate, return assets.
// Supports two modes:
//   mode: "single" — one cut at a time (grade + count).
//   mode: "set"    — paired feed + platform shots, same scene, shared setId.

import { NextResponse } from "next/server";
import { pickProvider } from "@/lib/ai";
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
  mode?: "single" | "set";
  count?: number;            // for single mode
  sfwCount?: number;         // for set mode
  nsfwCount?: number;        // for set mode
};

function newSetId() {
  return `set_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request body, love." }, { status: 400 });
  }

  const { packId, presetId, prompt } = body;
  const mode = body.mode ?? "single";

  if (!packId || !presetId || !prompt) {
    return NextResponse.json({ ok: false, error: "Missing fields, darling." }, { status: 400 });
  }

  const pack = getPack(packId);
  if (!pack) {
    return NextResponse.json({ ok: false, error: "Pack not found." }, { status: 404 });
  }

  // Pre-flight is grade-agnostic; pick any active provider's classifier.
  // (All providers share the same regex baseline; in production, layer Hive
  // on top here.)
  const sample = pickProvider({
    packId,
    grade: body.grade ?? pack.defaultGrade,
    type: pack.id === "video" ? "video" : "image",
  });
  const pre = await sample.preflightPrompt(prompt);
  if (!pre.ok) {
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

  // Branch on mode.
  let plan: { grade: Grade; count: number }[];

  if (mode === "set") {
    const sfwCount = Math.max(0, Math.min(8, body.sfwCount ?? 0));
    const nsfwCount = Math.max(0, Math.min(8, body.nsfwCount ?? 0));

    if (sfwCount + nsfwCount === 0) {
      return NextResponse.json({ ok: false, error: "Pick a few of each, darling." }, { status: 400 });
    }
    if (nsfwCount > 0 && !pack.supports.includes("graded")) {
      return NextResponse.json(
        { ok: false, error: `${pack.name} doesn't ship a platform cut.` },
        { status: 400 },
      );
    }

    plan = [];
    if (sfwCount) plan.push({ grade: "sfw", count: sfwCount });
    if (nsfwCount) plan.push({ grade: "graded", count: nsfwCount });
  } else {
    const grade = body.grade ?? pack.defaultGrade;
    if (!pack.supports.includes(grade)) {
      return NextResponse.json(
        { ok: false, error: `${pack.name} doesn't ship a ${grade} cut.` },
        { status: 400 },
      );
    }
    const count = Math.max(1, Math.min(8, body.count ?? 4));
    plan = [{ grade, count }];
  }

  // Run each grade-bucket through the provider. In production, both buckets
  // share the same seed + composition prompt for visual coherence; here the
  // stub just produces paired gradient art so sets feel related.
  const allItems: VaultItem[] = [];
  const setId = mode === "set" ? newSetId() : undefined;
  let setIndex = 0;
  const totalRequested = plan.reduce((s, p) => s + p.count, 0);

  for (const bucket of plan) {
    // Each grade-bucket picks its own provider — fal for SFW, runpod for
    // graded, whatever AI_ROUTING says. The whole point of the router.
    const provider = pickProvider({
      packId,
      grade: bucket.grade,
      type: pack.id === "video" ? "video" : "image",
    });

    let result;
    try {
      result = await provider.generate({
        userId: "demo-user",
        modelId: "demo-model",
        prompt,
        packId,
        presetId,
        grade: bucket.grade,
        watermark: body.watermark ?? "invisible",
        visibleAiBadge: body.visibleAiBadge ?? false,
        type: pack.id === "video" ? "video" : "image",
        count: bucket.count,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown provider error";
      return NextResponse.json(
        { ok: false, error: `Generation provider blinked: ${msg}`, provider: provider.name },
        { status: 502 },
      );
    }

    const post = await provider.postModerate(result.assets);
    if (!post.ok) {
      return NextResponse.json(
        { ok: false, error: "Output didn't pass moderation. Try a different look, darling." },
        { status: 422 },
      );
    }

    for (const a of result.assets) {
      setIndex += 1;
      const realUrl = a.url && !a.url.startsWith("data:demo") ? a.url : undefined;
      allItems.push({
        id: a.id,
        packId,
        presetId,
        prompt,
        grade: bucket.grade,
        createdAt: Date.now(),
        favorite: false,
        postedTo: [],
        art: a.art,
        url: realUrl,
        watermark: body.watermark ?? "invisible",
        aiTagged: true,
        type: a.type,
        setId,
        setSize: setId ? totalRequested : undefined,
        setIndex: setId ? setIndex : undefined,
      });
    }
  }

  return NextResponse.json({ ok: true, items: allItems, setId });
}
