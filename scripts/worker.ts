// Standalone BullMQ worker process.
// Run with: `npm run worker`
//
// Set REDIS_URL in your environment. Without it, this exits immediately.

import { startWorker, isQueueEnabled } from "../src/lib/queue";

async function main() {
  if (!isQueueEnabled()) {
    console.error("REDIS_URL not set — worker exiting. (Inline generation still works.)");
    process.exit(0);
  }
  const w = await startWorker();
  if (!w) {
    console.error("Worker failed to start");
    process.exit(1);
  }
  console.warn("[worker] La Di Da generation worker online.");
  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.warn("[worker] SIGINT, draining…");
    await w.close();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    console.warn("[worker] SIGTERM, draining…");
    await w.close();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error("[worker] fatal", e);
  process.exit(1);
});
