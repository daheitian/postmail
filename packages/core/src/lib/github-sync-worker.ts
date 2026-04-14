/**
 * GitHub Sync Worker
 *
 * Processes queued sync jobs. Used as the consumer handler for both
 * Cloudflare Queues and the DB-backed polling fallback.
 */

import { createGitHubSyncService } from "../services/github-sync.js";
import type { SiteConfig } from "../services/export.js";
import type { Services } from "../services/index.js";
import type { JobPayload } from "./job-queue.js";

/**
 * Process a single GitHub Sync job.
 *
 * @param payload - The job payload from the queue
 * @param services - Jant services for the target site
 * @param siteConfig - Site configuration for export serialization
 */
export async function processGitHubSyncJob(
  payload: JobPayload,
  services: Services,
  siteConfig: SiteConfig,
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
  );

  if (payload.kind === "github-sync-push") {
    const { postId, action } = payload.data as {
      postId: string;
      action: "upsert" | "delete";
    };
    await syncService.pushPostChange(postId, action);
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
