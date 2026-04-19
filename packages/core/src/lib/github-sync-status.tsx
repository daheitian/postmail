/**
 * Shared helpers for reading GitHub Sync status and rendering the status card.
 *
 * Consumed by:
 * - GET  /api/github-sync/status/stream  — live status polling loop
 * - POST /settings/github-sync/push      — returns an SSE that patches the
 *   status card into pending state immediately, so the inline spinner + the
 *   subsequent live stream drive the UX instead of a toast.
 *
 * Both call sites render the same `<GitHubSyncStatusCard>` through
 * `renderStatusCardHtml`, so any markup change flows to both automatically.
 */
import type { Context } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { isSyncPending } from "./github-sync-trigger.js";
import { getGitHubAppConfig } from "./env.js";
import { toPublicPath } from "./url.js";
import { I18nProvider } from "../i18n/context.js";
import {
  GitHubSyncStatusCard,
  type GitHubSyncStatus,
} from "../ui/dash/settings/GitHubSyncContent.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export type { GitHubSyncStatus };

export async function readGitHubSyncStatus(
  c: Context<Env>,
): Promise<GitHubSyncStatus> {
  const [
    enabled,
    repo,
    lastPushSha,
    webhookId,
    lastPushAt,
    authMode,
    lastError,
  ] = await Promise.all([
    c.var.services.settings.get("GITHUB_SYNC_ENABLED"),
    c.var.services.settings.get("GITHUB_SYNC_REPO"),
    c.var.services.settings.get("GITHUB_SYNC_LAST_PUSH_SHA"),
    c.var.services.settings.get("GITHUB_SYNC_WEBHOOK_ID"),
    c.var.services.settings.get("GITHUB_SYNC_LAST_PUSH_AT"),
    c.var.services.settings.get("GITHUB_SYNC_AUTH_MODE"),
    c.var.services.settings.get("GITHUB_SYNC_LAST_ERROR"),
  ]);
  // Use isSyncPending (not raw flag) so clients don't get stuck on a dead
  // PENDING flag left by a crashed worker.
  const pending = await isSyncPending(c.var.services.settings);

  return {
    enabled: enabled === "true",
    repo: repo ?? null,
    lastPushSha: lastPushSha ?? null,
    webhookId: webhookId ?? null,
    lastPushAt: lastPushAt ? Number(lastPushAt) : null,
    authMode: authMode === "app" ? "app" : "pat",
    appConfigured: getGitHubAppConfig(c.env) !== null,
    pending,
    lastError: lastError || null,
  };
}

export function renderStatusCardHtml(
  c: Context<Env>,
  status: GitHubSyncStatus,
  streamUrl: string,
): string {
  // Hono JSX elements stringify synchronously when the tree is sync. Our
  // status card has no async children, so `String(...)` returns a plain
  // HTML string. The I18nProvider binds the per-request i18n instance that
  // `useLingui()` inside the card relies on.
  return String(
    <I18nProvider c={c}>
      <GitHubSyncStatusCard status={status} streamUrl={streamUrl} />
    </I18nProvider>,
  );
}

export function getSyncStatusStreamUrl(c: Context<Env>): string {
  return toPublicPath(
    "/api/github-sync/status/stream",
    c.var.appConfig.sitePathPrefix,
  );
}
