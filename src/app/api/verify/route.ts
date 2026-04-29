// POST /api/verify — kick off ID verification (Persona / Stripe Identity / Veriff).
// Demo returns ok immediately. Wire the real provider in production.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({
    ok: true,
    provider: process.env.ID_VERIFY_PROVIDER ?? "stub",
    sessionUrl: null, // production: hosted-flow URL from Persona/Stripe
  });
}
