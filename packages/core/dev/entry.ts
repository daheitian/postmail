import { createApp } from "../src/index.js";

const app = createApp();

export default {
  fetch: app.fetch,
  async queue(
    batch: MessageBatch<unknown>,
    env: Record<string, unknown>,
  ): Promise<void> {
    // Dynamically import to avoid bundling when queue is unused
    const { handleQueueBatch } =
      await import("../src/lib/github-sync-queue-handler.js");
    await handleQueueBatch(batch, env);
  },
};
