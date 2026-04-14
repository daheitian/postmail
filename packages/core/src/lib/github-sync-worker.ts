/**
 * GitHub Sync Worker
 *
 * Processes queued sync jobs. Push jobs always run a full sync.
 * After completing, re-checks the pending flag to catch changes
 * that arrived during execution.
 */

import { createGitHubSyncService } from "../services/github-sync.js";
import type { SiteConfig } from "../services/export.js";
import type { Services } from "../services/index.js";
import type { StorageDriver } from "../lib/storage.js";
import type { JobPayload } from "./job-queue.js";

/**
 * Process a single GitHub Sync job.
 */
export async function processGitHubSyncJob(
  payload: JobPayload,
  services: Services,
  siteConfig: SiteConfig,
  storage?: StorageDriver | null,
): Promise<void> {
  const syncService = createGitHubSyncService(
    {
      posts: services.posts,
      paths: services.paths,
      collections: services.collections,
      media: services.media,
      settings: services.settings,
    },
    siteConfig,
    { storage },
  );

  if (payload.kind === "github-sync-push") {
    // Clear pending flag before running so new triggers during
    // execution will set it again.
    await services.settings.set("GITHUB_SYNC_PENDING", "");

    await syncService.pushFullSync();

    // If the flag was re-set during execution, run once more
    const stillPending = await services.settings.get("GITHUB_SYNC_PENDING");
    if (stillPending === "true") {
      await services.settings.set("GITHUB_SYNC_PENDING", "");
      await syncService.pushFullSync();
    }
    return;
  }

  if (payload.kind === "github-sync-pull") {
    const webhookPayload = payload.data as {
      ref: string;
      before: string;
      after: string;
      commits: Array<{
        id: string;
        message: string;
        added: string[];
        modified: string[];
        removed: string[];
      }>;
    };
    await syncService.handleWebhookPush(webhookPayload);
    return;
  }
}
