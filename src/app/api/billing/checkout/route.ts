// POST /api/billing/checkout — start a checkout session.
// Adult-friendly processors only: CCBill, Segpay, Epoch, NOWPayments (crypto).
// DO NOT add Stripe — their AUP forbids adult content.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = { tier?: string; topUp?: number };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;

  // Demo: return a fake checkout URL.
  // Production: branch on processor, return the hosted URL the user is redirected to.
  return NextResponse.json({
    ok: true,
    processor: "ccbill",
    checkoutUrl: `https://example.invalid/ccbill/checkout?tier=${body.tier ?? ""}&topUp=${body.topUp ?? ""}`,
  });
}
