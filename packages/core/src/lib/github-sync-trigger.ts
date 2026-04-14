/**
 * GitHub Sync Trigger
 *
 * Debounced trigger for full-sync pushes. Multiple rapid post changes
 * collapse into a single sync job:
 *
 * 1. Set GITHUB_SYNC_PENDING = "true"
 * 2. If no job is already queued, enqueue one
 * 3. The worker runs full sync, clears the flag, then checks again —
 *    if the flag was re-set during execution, it runs once more.
 */

import type { SettingsService } from "../services/settings.js";
import { noopQueue, type JobQueue } from "./job-queue.js";
import { createCfJobQueue } from "./job-queue-cf.js";

/**
 * Resolve the appropriate job queue from the environment.
 * Returns the CF Queue adapter if available, otherwise noop.
 */
export function resolveJobQueue(env: { GITHUB_SYNC_QUEUE?: Queue }): JobQueue {
  if (env.GITHUB_SYNC_QUEUE) {
    return createCfJobQueue(env.GITHUB_SYNC_QUEUE);
  }
  return noopQueue;
}

/**
 * Request a full GitHub Sync push. Safe to call on every post mutation.
 *
 * Uses a pending flag for debounce: if a sync is already queued or
 * running, no new job is created — the running job will pick up
 * the changes when it re-checks the flag after completion.
 */
export async function triggerGitHubSync(
  queue: JobQueue,
  settings: SettingsService,
  siteId: string,
): Promise<void> {
  const enabled = await settings.get("GITHUB_SYNC_ENABLED");
  if (enabled !== "true") return;

  // Check if a sync is already pending
  const alreadyPending = await settings.get("GITHUB_SYNC_PENDING");
  if (alreadyPending === "true") return;

  // Mark as pending and enqueue
  await settings.set("GITHUB_SYNC_PENDING", "true");
  await queue.enqueue({
    kind: "github-sync-push",
    siteId,
    data: {},
  });
}
