// POST /api/verify — start an ID-verification session.
//
// Default provider: Persona. Their hosted-flow accepts a referenceId we use
// as our internal user id, posts back to /api/verify/webhook when the user
// completes the inquiry, and we flip idVerified=true server-side from the
// webhook (NOT from the client redirect — that's spoofable).
//
// Other supported providers (set via ID_VERIFY_PROVIDER):
//   stub             — no-op, immediate ok (demo)
//   stripe-identity  — Stripe Verification Sessions (works for non-adult use,
//                      but Stripe's full AUP forbids adult content so this is
//                      only for the SFW track if you ever add one)
//   veriff           — Veriff sessions endpoint

import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface Body {
  userId?: string;
  email?: string;
  templateId?: string; // Persona inquiry template
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const provider = (process.env.ID_VERIFY_PROVIDER ?? "stub").toLowerCase();

  if (!body.userId) {
    return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
  }

  if (provider === "stub") {
    return NextResponse.json({ ok: true, provider: "stub", sessionUrl: null });
  }

  if (provider === "persona") {
    const apiKey = process.env.PERSONA_API_KEY;
    const templateId = body.templateId ?? process.env.PERSONA_TEMPLATE_ID;
    if (!apiKey || !templateId) {
      return NextResponse.json(
        { ok: false, error: "PERSONA_API_KEY + PERSONA_TEMPLATE_ID required" },
        { status: 500 },
      );
    }

    const res = await fetch("https://withpersona.com/api/v1/inquiries", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Persona-Version": "2023-01-05",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            "inquiry-template-id": templateId,
            "reference-id": body.userId,
            fields: body.email ? { "email-address": body.email } : undefined,
          },
        },
      }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `persona ${res.status}: ${await res.text()}` },
        { status: 502 },
      );
    }
    const j = (await res.json()) as {
      data?: { id: string; attributes?: { "session-token": string } };
    };
    const inquiryId = j.data?.id;
    const sessionToken = j.data?.attributes?.["session-token"];
    if (!inquiryId || !sessionToken) {
      return NextResponse.json(
        { ok: false, error: "persona returned no inquiry/session" },
        { status: 502 },
      );
    }
    // Hosted-flow URL the client opens. The completion webhook flips
    // idVerified server-side; the client just polls /api/verify/status.
    const sessionUrl = `https://withpersona.com/verify?inquiry-id=${inquiryId}&session-token=${sessionToken}`;
    return NextResponse.json({ ok: true, provider: "persona", inquiryId, sessionUrl });
  }

  if (provider === "veriff") {
    const apiKey = process.env.VERIFF_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "VERIFF_API_KEY required" }, { status: 500 });
    }
    const res = await fetch("https://stationapi.veriff.com/v1/sessions", {
      method: "POST",
      headers: {
        "X-AUTH-CLIENT": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        verification: {
          callback: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/welcome?verified=1`,
          vendorData: body.userId,
        },
      }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `veriff ${res.status}: ${await res.text()}` },
        { status: 502 },
      );
    }
    const j = (await res.json()) as { verification?: { id: string; url: string } };
    return NextResponse.json({
      ok: true,
      provider: "veriff",
      inquiryId: j.verification?.id,
      sessionUrl: j.verification?.url ?? null,
    });
  }

  return NextResponse.json({ ok: false, error: `unknown provider: ${provider}` }, { status: 400 });
}
