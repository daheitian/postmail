/**
 * GitHub Sync Trigger
 *
 * Thin helper called from post mutation routes to enqueue a sync job
 * when GitHub Sync is enabled. Designed to be non-blocking — the route
 * returns immediately and the actual sync happens in a background job.
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
 * Enqueue a GitHub Sync push job if sync is enabled.
 *
 * Call this after a post is created, updated, or deleted.
 * Safe to call when sync is not configured — it's a no-op.
 *
 * @param queue - Job queue instance (CF Queue or DB-backed)
 * @param settings - Settings service to check GITHUB_SYNC_ENABLED
 * @param siteId - Current site ID
 * @param postId - The post that changed
 * @param action - Whether the post was upserted or deleted
 */
export async function triggerGitHubSyncPush(
  queue: JobQueue,
  settings: SettingsService,
  siteId: string,
  postId: string,
  action: "upsert" | "delete",
): Promise<void> {
  const enabled = await settings.get("GITHUB_SYNC_ENABLED");
  if (enabled !== "true") return;

  await queue.enqueue({
    kind: "github-sync-push",
    siteId,
    data: { postId, action },
  });
}
