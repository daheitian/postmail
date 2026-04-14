/**
 * Cloudflare Queue adapter for the job queue.
 */

import type { JobPayload, JobQueue } from "./job-queue.js";

/**
 * Create a job queue backed by a Cloudflare Queue binding.
 *
 * @param queue - The CF Queue binding (e.g. `env.GITHUB_SYNC_QUEUE`)
 */
export function createCfJobQueue(queue: Queue): JobQueue {
  return {
    async enqueue(payload: JobPayload) {
      await queue.send(payload);
    },
  };
}
