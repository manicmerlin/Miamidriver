// Optional background queue for generation jobs.
//
// Why: /api/generate currently awaits the provider inline. RunPod cold starts
// can take 30–60s; Kling video can take 90s+. Edge-runtime caps and even
// nodejs-runtime defaults can chew through that. Putting work on a queue
// gives us:
//   - The HTTP request returns immediately with a jobId.
//   - The client polls /api/generate/status?jobId=…
//   - The worker process owns the long-running provider call.
//
// Gating: if REDIS_URL is unset, this module is a no-op shim — the consumer
// (route handlers) call ensureQueue() and either get a real Queue or null,
// and falls back to inline execution. This means the codebase still works
// in dev without a Redis instance.

import type { Queue, Worker } from "bullmq";

const QUEUE_NAME = "ladida-generate";
let queue: Queue | null | undefined;
let worker: Worker | null | undefined;

export function isQueueEnabled(): boolean {
  return !!process.env.REDIS_URL;
}

async function getConnection() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const { default: IORedis } = await import("ioredis");
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export async function ensureQueue(): Promise<Queue | null> {
  if (queue !== undefined) return queue;
  if (!isQueueEnabled()) {
    queue = null;
    return null;
  }
  const conn = await getConnection();
  if (!conn) {
    queue = null;
    return null;
  }
  const { Queue } = await import("bullmq");
  queue = new Queue(QUEUE_NAME, { connection: conn });
  return queue;
}

export interface GenerateJobData {
  userId: string;
  modelId: string;
  packId: string;
  presetId: string;
  prompt: string;
  grade: "sfw" | "graded";
  watermark: "invisible" | "visible-corner" | "off";
  visibleAiBadge: boolean;
  type: "image" | "video";
  count: number;
  setId?: string;
}

export interface GenerateJobResult {
  ok: boolean;
  items?: unknown[];
  error?: string;
}

/**
 * Worker entry — call from a separate process (`npm run worker`) so the
 * Next.js process doesn't carry long-running tasks. Idempotent.
 */
export async function startWorker(): Promise<Worker | null> {
  if (worker !== undefined) return worker;
  if (!isQueueEnabled()) {
    worker = null;
    return null;
  }
  const conn = await getConnection();
  if (!conn) {
    worker = null;
    return null;
  }

  const { Worker } = await import("bullmq");
  const { pickProvider } = await import("./ai");
  const { moderateAssets } = await import("./moderation");

  worker = new Worker<GenerateJobData, GenerateJobResult>(
    QUEUE_NAME,
    async (job) => {
      const data = job.data;
      const provider = pickProvider({
        packId: data.packId,
        grade: data.grade,
        type: data.type,
      });
      const result = await provider.generate({
        userId: data.userId,
        modelId: data.modelId,
        prompt: data.prompt,
        packId: data.packId,
        presetId: data.presetId,
        grade: data.grade,
        watermark: data.watermark,
        visibleAiBadge: data.visibleAiBadge,
        type: data.type,
        count: data.count,
      });
      const post = await moderateAssets(result.assets);
      if (!post.ok) {
        return { ok: false, error: "post-moderation blocked" };
      }
      return { ok: true, items: result.assets };
    },
    { connection: conn, concurrency: Number(process.env.QUEUE_CONCURRENCY ?? "4") },
  );

  return worker;
}

export const QUEUE = QUEUE_NAME;
