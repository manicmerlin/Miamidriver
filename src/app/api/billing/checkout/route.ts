// POST /api/billing/checkout — start a checkout session.
//
// Adult-friendly processors only (Stripe is forbidden by their AUP):
//   ccbill         — industry default for adult subscriptions; FlexForms hosted URL
//   segpay         — alternative card processor
//   nowpayments    — crypto fallback (BTC, USDT, etc.)
//
// Set BILLING_PROCESSOR to pick the default. The client may override per-call.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Tier = "Trial" | "Darling" | "Bombshell" | "Icon";
type Body = {
  tier?: Tier;
  topUp?: number;       // credit pack: 200 / 500 / 1200, etc.
  amountUsd?: number;   // server can also derive from tier/topUp
  userId?: string;
  email?: string;
  processor?: "ccbill" | "segpay" | "nowpayments";
};

function tierAmountUsd(tier?: Tier): number | null {
  if (!tier) return null;
  switch (tier) {
    case "Trial": return null;       // free
    case "Darling": return 29;
    case "Bombshell": return 79;
    case "Icon": return 199;
  }
}

function topUpAmountUsd(credits?: number): number | null {
  if (!credits) return null;
  // 100 credits = $10, with discounts at higher tiers.
  if (credits >= 1200) return 99;
  if (credits >= 500) return 45;
  if (credits >= 200) return 20;
  return Math.round(credits / 10);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const processor =
    body.processor ?? (process.env.BILLING_PROCESSOR ?? "ccbill").toLowerCase();

  const amount =
    body.amountUsd ??
    tierAmountUsd(body.tier) ??
    topUpAmountUsd(body.topUp) ??
    0;

  if (!amount) {
    return NextResponse.json({ ok: false, error: "amount required" }, { status: 400 });
  }
  if (!body.userId) {
    return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
  }

  if (processor === "ccbill") {
    const account = process.env.CCBILL_ACCOUNT;
    const subaccount = process.env.CCBILL_SUBACCOUNT;
    const formName = process.env.CCBILL_FORM_NAME;       // their FlexForm id
    const flexId = process.env.CCBILL_FLEX_FORM_ID;
    if (!account || !subaccount || !flexId) {
      return NextResponse.json(
        { ok: false, error: "CCBILL_ACCOUNT + CCBILL_SUBACCOUNT + CCBILL_FLEX_FORM_ID required" },
        { status: 500 },
      );
    }

    // CCBill FlexForms URL. The form itself is configured in the CCBill admin
    // (price points, recurring or one-shot, currency). We pass the user
    // identifier through `customField1` so the postback maps back to our user.
    const params = new URLSearchParams({
      clientAccnum: account,
      clientSubacc: subaccount,
      ...(formName ? { formName } : {}),
      currencyCode: "840", // USD
      customField1: body.userId,
      ...(body.email ? { email: body.email } : {}),
    });
    const checkoutUrl = `https://api.ccbill.com/wap-frontflex/flexforms/${flexId}?${params.toString()}`;
    return NextResponse.json({ ok: true, processor: "ccbill", checkoutUrl, amount });
  }

  if (processor === "nowpayments") {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "NOWPAYMENTS_API_KEY required" }, { status: 500 });
    }
    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: "usd",
        order_id: `${body.userId}_${Date.now()}`,
        order_description: body.tier
          ? `La Di Da — ${body.tier}`
          : `La Di Da — ${body.topUp} credits`,
        ipn_callback_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/billing/webhook`,
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/account?paid=1`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/account`,
      }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `nowpayments ${res.status}: ${await res.text()}` },
        { status: 502 },
      );
    }
    const j = (await res.json()) as { invoice_url?: string; id?: string };
    return NextResponse.json({
      ok: true,
      processor: "nowpayments",
      checkoutUrl: j.invoice_url,
      invoiceId: j.id,
      amount,
    });
  }

  if (processor === "segpay") {
    const packageId = process.env.SEGPAY_PACKAGE_ID;
    const merchantId = process.env.SEGPAY_MERCHANT_ID;
    if (!packageId || !merchantId) {
      return NextResponse.json(
        { ok: false, error: "SEGPAY_PACKAGE_ID + SEGPAY_MERCHANT_ID required" },
        { status: 500 },
      );
    }
    // SegPay also uses a hosted form URL with merchant + package id.
    const params = new URLSearchParams({
      x_eticketid: packageId,
      x_login: merchantId,
      x_username: body.userId,
      ...(body.email ? { x_email: body.email } : {}),
    });
    return NextResponse.json({
      ok: true,
      processor: "segpay",
      checkoutUrl: `https://secure2.segpay.com/billing/poset.cgi?${params.toString()}`,
      amount,
    });
  }

  return NextResponse.json(
    { ok: false, error: `unknown processor: ${processor}` },
    { status: 400 },
  );
}
