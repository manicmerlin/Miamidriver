// GET /api/generate/status?jobId=… — poll a queued generation job.
//
// Only meaningful when REDIS_URL is set. With no queue, the original
// /api/generate returns items synchronously and this route is unused.

import { NextResponse } from "next/server";
import { ensureQueue, isQueueEnabled } from "@/lib/queue";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isQueueEnabled()) {
    return NextResponse.json(
      { ok: false, error: "queue not enabled (no REDIS_URL)" },
      { status: 400 },
    );
  }
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "jobId required" }, { status: 400 });
  }
  const q = await ensureQueue();
  if (!q) return NextResponse.json({ ok: false, error: "queue unavailable" }, { status: 500 });

  const job = await q.getJob(jobId);
  if (!job) return NextResponse.json({ ok: false, error: "job not found" }, { status: 404 });

  const state = await job.getState();
  if (state === "completed") {
    return NextResponse.json({ ok: true, state, result: job.returnvalue });
  }
  if (state === "failed") {
    return NextResponse.json({ ok: false, state, error: job.failedReason });
  }
  return NextResponse.json({
    ok: true,
    state,
    progress: job.progress,
  });
}
