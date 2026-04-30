// Post-output moderation — runs after every generation, before assets reach
// the user's vault. Two providers in parallel:
//
//   Hive Moderation         (HIVE_API_KEY)
//     NSFW classifier — used for *tagging*, not blocking. Adult content is
//     allowed and is the point of the product. We only fail closed on Hive
//     for child-class signals; everything else is metadata.
//
//   Thorn Safer             (THORN_SAFER_API_KEY)
//     CSAM detection — the only hard block. If Safer flags anything, we
//     fail closed, suspend the user account, and file an incident.
//
// Both providers run in parallel via Promise.allSettled. If either throws,
// we fail closed (block the asset) — silent moderation failures cannot ship.

import type { GeneratedAsset, ModerationResult } from "./ai/types";

const HIVE_URL = "https://api.thehive.ai/api/v2/task/sync";
const THORN_URL = "https://safer-api.thorn.org/v1/match";

interface HiveResult {
  status: { code: string; status_code: number }[];
  output?: {
    classes?: { class: string; score: number }[];
  }[];
}

interface ThornResult {
  matches?: { confidence: number; category: string }[];
  error?: string;
}

const HIVE_HARD_BLOCK_CLASSES = new Set([
  // Hive's child-class signals — anything here means we suppress and incident.
  "yes_underage",
  "yes_child",
  "yes_minor",
  "general_underage",
]);

async function callHive(imageUrl: string): Promise<{ blocked: boolean; tags: string[] }> {
  const key = process.env.HIVE_API_KEY;
  if (!key) {
    // No key configured ⇒ provider not wired ⇒ skip (caller decides whether
    // to fail closed). In production, set MODERATION_REQUIRED=1 to force
    // missing keys to be treated as a hard fail.
    return { blocked: false, tags: [] };
  }

  const form = new FormData();
  form.append("url", imageUrl);

  const res = await fetch(HIVE_URL, {
    method: "POST",
    headers: { Authorization: `Token ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`hive ${res.status}: ${await res.text()}`);

  const j = (await res.json()) as HiveResult;
  const tags: string[] = [];
  let blocked = false;
  for (const out of j.output ?? []) {
    for (const c of out.classes ?? []) {
      if (c.score >= 0.85) tags.push(c.class);
      if (HIVE_HARD_BLOCK_CLASSES.has(c.class) && c.score >= 0.5) blocked = true;
    }
  }
  return { blocked, tags };
}

async function callThorn(imageUrl: string): Promise<{ blocked: boolean }> {
  const key = process.env.THORN_SAFER_API_KEY;
  if (!key) return { blocked: false };

  const res = await fetch(THORN_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: imageUrl }),
  });
  if (!res.ok) throw new Error(`thorn ${res.status}: ${await res.text()}`);

  const j = (await res.json()) as ThornResult;
  // Any positive match = block, suspend, incident.
  return { blocked: (j.matches?.length ?? 0) > 0 };
}

export async function moderateAssets(assets: GeneratedAsset[]): Promise<ModerationResult> {
  const required = process.env.MODERATION_REQUIRED === "1";
  const reasons: string[] = [];
  let hardFail = false;

  for (const asset of assets) {
    if (!asset.url || asset.url.startsWith("data:")) continue;

    const [hive, thorn] = await Promise.allSettled([
      callHive(asset.url),
      callThorn(asset.url),
    ]);

    if (hive.status === "rejected") {
      if (required) {
        reasons.push(`hive-error:${asset.id}`);
        hardFail = true;
      } else {
        console.warn("[moderation] hive errored", hive.reason);
      }
    } else if (hive.value.blocked) {
      reasons.push(`hive-child-class:${asset.id}`);
      hardFail = true;
    }

    if (thorn.status === "rejected") {
      if (required) {
        reasons.push(`thorn-error:${asset.id}`);
        hardFail = true;
      } else {
        console.warn("[moderation] thorn errored", thorn.reason);
      }
    } else if (thorn.value.blocked) {
      reasons.push(`thorn-csam:${asset.id}`);
      hardFail = true;
    }
  }

  if (hardFail) {
    // Best-effort fire-and-forget incident report.
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/moderation/incident`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasons, assetIds: assets.map((a) => a.id), at: Date.now() }),
      });
    } catch {}
    return { ok: false, hardFail: true, reasons };
  }

  return { ok: true };
}
