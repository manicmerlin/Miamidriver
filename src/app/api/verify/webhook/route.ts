// Persona webhook — fires when an inquiry transitions state.
//
// Flow:
//   1. Persona POSTs to this endpoint with the inquiry payload.
//   2. We verify the HMAC signature using PERSONA_WEBHOOK_SECRET.
//   3. If status == "approved", we flip the user's idVerified bit in the DB.
//
// Today there is no DB — state lives in localStorage on the client. So this
// route writes to a tiny KV table-or-equivalent once one exists. For now it
// records a console line and returns 200 so Persona stops retrying.
//
// When you wire Postgres:
//   - Persist `inquiry_id`, `reference_id` (= userId), `status`, `decision`
//     into a `verifications` table.
//   - On "approved", `UPDATE users SET id_verified = true WHERE id = reference_id;`
//   - On "declined" / "needs_review", page on-call.

import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

interface PersonaWebhookBody {
  data?: {
    attributes?: {
      payload?: {
        data?: {
          id?: string;
          attributes?: {
            status?: string;
            "reference-id"?: string;
            "name-first"?: string;
            "name-last"?: string;
          };
        };
      };
    };
  };
}

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  // Persona's signature header looks like: "t=<unixsec>,v1=<hex>"
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.trim().split("=")),
  ) as Record<string, string>;
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const signed = `${t}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  // timingSafeEqual on equal-length buffers
  if (v1.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"));
}

export async function POST(req: Request) {
  const secret = process.env.PERSONA_WEBHOOK_SECRET;
  const raw = await req.text();
  const sig = req.headers.get("persona-signature");

  if (secret && !verifySignature(raw, sig, secret)) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }

  const body = JSON.parse(raw) as PersonaWebhookBody;
  const inquiry = body.data?.attributes?.payload?.data;
  const status = inquiry?.attributes?.status;
  const referenceId = inquiry?.attributes?.["reference-id"];
  const inquiryId = inquiry?.id;

  // TODO(db): persist verification row, flip user.idVerified on "approved".
  console.warn("[persona webhook]", {
    inquiryId,
    referenceId,
    status,
  });

  return NextResponse.json({ ok: true });
}
