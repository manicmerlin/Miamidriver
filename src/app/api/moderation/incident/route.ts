// POST /api/moderation/incident — record a moderation event for review.
// Production: write to incidents table, page on-call if hardFail, suspend account.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // In a real build: persist; trigger account review; notify human.
  console.warn("[moderation incident]", body);
  return NextResponse.json({ ok: true, received: true });
}
