// Billing webhooks — CCBill "Background Posts" + NOWPayments IPN.
//
// Both processors POST a transaction record here when a charge clears.
// We verify the signature, then credit the user.
//
// CCBill:
//   - Configure "Background Post URL" in CCBill admin → this endpoint.
//   - They'll post form-encoded fields including `customField1` (we set it to
//     userId in /checkout) and the transaction id + amount.
//   - There's no shared secret on CCBill posts; instead, they require IP
//     allow-listing on your end. Their IPs are documented in their portal.
//
// NOWPayments:
//   - Configure IPN callback URL in their dashboard or pass it per-invoice.
//   - They sign each post with HMAC-SHA512 of the sorted JSON body using your
//     IPN secret (NOWPAYMENTS_IPN_SECRET).

import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

const CCBILL_ALLOWED_IPS = (process.env.CCBILL_ALLOWED_IPS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isCCBill(req: Request): boolean {
  const ua = req.headers.get("user-agent") ?? "";
  return ua.toLowerCase().includes("ccbill") ||
    !!req.headers.get("x-ccbill-event") ||
    new URL(req.url).searchParams.get("source") === "ccbill";
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "";
}

function verifyNowpayments(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  // NOWPayments signs the JSON body sorted alphabetically, then HMAC-SHA512.
  const parsed = JSON.parse(rawBody) as Record<string, unknown>;
  const sorted = JSON.stringify(
    Object.keys(parsed)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => ((acc[k] = parsed[k]), acc), {}),
  );
  const expected = crypto.createHmac("sha512", secret).update(sorted).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}

export async function POST(req: Request) {
  const raw = await req.text();

  // ── CCBill ──────────────────────────────────────────────────────────────
  if (isCCBill(req)) {
    const ip = clientIp(req);
    if (CCBILL_ALLOWED_IPS.length && !CCBILL_ALLOWED_IPS.includes(ip)) {
      return NextResponse.json({ ok: false, error: "untrusted ip" }, { status: 401 });
    }
    const params = new URLSearchParams(raw);
    const userId = params.get("customField1");
    const transactionId = params.get("transactionId");
    const amount = params.get("billedAmount") ?? params.get("accountingAmount");
    const eventType = params.get("eventType") ?? "NewSaleSuccess";

    // TODO(db): record (userId, transactionId, eventType, amount); on
    // NewSaleSuccess credit the tier or top-up; on Cancellation flip the tier.
    console.warn("[ccbill webhook]", { userId, transactionId, amount, eventType });
    return NextResponse.json({ ok: true });
  }

  // ── NOWPayments ─────────────────────────────────────────────────────────
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  const signature = req.headers.get("x-nowpayments-sig");
  if (secret && !verifyNowpayments(raw, signature, secret)) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }
  const body = JSON.parse(raw) as {
    payment_status?: string;
    order_id?: string;
    price_amount?: number;
  };
  if (body.payment_status === "finished" || body.payment_status === "confirmed") {
    const userId = body.order_id?.split("_")[0];
    // TODO(db): credit the user.
    console.warn("[nowpayments webhook]", {
      userId,
      orderId: body.order_id,
      amount: body.price_amount,
    });
  }
  return NextResponse.json({ ok: true });
}
