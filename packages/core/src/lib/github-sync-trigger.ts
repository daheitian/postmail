/**
 * GitHub Sync Trigger
 *
 * `triggerGitHubSyncInline` runs pushFullSync in the current worker
 * invocation via `c.executionCtx.waitUntil`. Works uniformly on
 * Workers and Node, no queue binding required.
 *
 * Debounces through a PENDING flag. When a new trigger arrives while
 * a sync is running, the inline runner records it via DIRTY; the
 * running sync re-runs once more after completion so the new edits
 * land.
 */

import type { Context } from "hono";
import type { SettingsService } from "../services/settings.js";
import type { GitHubSyncService } from "../services/github-sync.js";
import type { AppVariables } from "../types/app-context.js";
import type { Bindings } from "../types/bindings.js";
import { buildSyncSiteConfig } from "./github-sync-site-config.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

/**
 * Maximum time a sync is allowed to be "in flight" before we consider
 * the PENDING flag stale. Covers worker crashes, timeouts, and any
 * other path where `runBackgroundSync`'s `finally` didn't execute.
 *
 * Normal syncs are a few seconds; a very large site might take a
 * minute or two. Ten minutes is comfortably above the worst realistic
 * case without trapping users under a stuck indicator forever.
 */
export const SYNC_PENDING_STALE_SECONDS = 10 * 60;

/**
 * Returns the effective "sync in progress" state.
 *
 * A plain read of `GITHUB_SYNC_PENDING` can lie — the flag stays
 * "true" if the worker died before the finally clause ran. This helper
 * cross-checks `GITHUB_SYNC_PENDING_AT`: if the timestamp is missing
 * or older than `SYNC_PENDING_STALE_SECONDS`, we treat PENDING as
 * not actually pending so the UI and trigger paths self-heal.
 */
export async function isSyncPending(
  settings: SettingsService,
): Promise<boolean> {
  const [pending, pendingAt] = await Promise.all([
    settings.get("GITHUB_SYNC_PENDING"),
    settings.get("GITHUB_SYNC_PENDING_AT"),
  ]);
  if (pending !== "true") return false;
  const ts = Number(pendingAt);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec - ts <= SYNC_PENDING_STALE_SECONDS;
}

/**
 * Flip the sync state to "pending" with a timestamp. Call before kicking
 * off `runBackgroundSync` so the status card shows "Syncing…" while the
 * push runs and `isSyncPending` can tell stuck flags from live ones.
 */
export async function markSyncPending(
  settings: SettingsService,
): Promise<void> {
  await settings.set("GITHUB_SYNC_PENDING", "true");
  await settings.set(
    "GITHUB_SYNC_PENDING_AT",
    String(Math.floor(Date.now() / 1000)),
  );
  await settings.set("GITHUB_SYNC_DIRTY", "");
}

/**
 * Run a full GitHub Sync push in the background, managing the lifecycle
 * flags (`GITHUB_SYNC_PENDING`, `GITHUB_SYNC_DIRTY`, `GITHUB_SYNC_LAST_ERROR`).
 *
 * If a trigger arrives mid-push, the dirty flag is set and we loop
 * once more after the current push completes so those edits land.
 * That's what `triggerGitHubSyncInline` relies on to guarantee
 * mid-sync writes aren't lost despite the PENDING gate blocking
 * concurrent pushes.
 */
export async function runBackgroundSync(
  settings: SettingsService,
  syncService: GitHubSyncService,
): Promise<void> {
  try {
    // Loop: push, then check whether another trigger came in during
    // execution. Clearing DIRTY *before* the push means anything set
    // after that cutoff causes exactly one more pass.
    while (true) {
      await settings.set("GITHUB_SYNC_DIRTY", "");
      await syncService.pushFullSync();
      const dirty = await settings.get("GITHUB_SYNC_DIRTY");
      if (dirty !== "true") break;
    }
    await settings.set("GITHUB_SYNC_LAST_ERROR", "");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await settings.set("GITHUB_SYNC_LAST_ERROR", message);
  } finally {
    await settings.set("GITHUB_SYNC_PENDING", "");
    await settings.set("GITHUB_SYNC_PENDING_AT", "");
    await settings.set("GITHUB_SYNC_DIRTY", "");
  }
}

/**
 * Debounced inline trigger. Every caller that wants a sync after a
 * content change should use this — it is the direct replacement for
 * the queue-based `triggerGitHubSync`.
 *
 * Debounce semantics:
 *   - If a sync is running already, mark DIRTY and return. The
 *     running sync picks up the flag and re-runs once finished.
 *   - Otherwise, set PENDING, build a sync service, and hand the
 *     push to `c.executionCtx.waitUntil` so the HTTP response can
 *     return immediately.
 *
 * Safe no-op when GitHub Sync isn't enabled for this site.
 */
export async function triggerGitHubSyncInline(c: Context<Env>): Promise<void> {
  const settings = c.var.services.settings;

  const enabled = await settings.get("GITHUB_SYNC_ENABLED");
  if (enabled !== "true") return;

  if (await isSyncPending(settings)) {
    // Another (non-stale) sync is in flight. Record this request so the
    // running sync re-runs after it finishes. No new push is kicked off
    // here — the `runBackgroundSync` loop handles it.
    await settings.set("GITHUB_SYNC_DIRTY", "true");
    return;
  }

  await markSyncPending(settings);

  const { createGitHubSyncService } =
    await import("../services/github-sync.js");
  const { getGitHubAppConfig } = await import("./env.js");
  const syncService = createGitHubSyncService(
    c.var.services,
    c.var.currentSite.id,
    await buildSyncSiteConfig(c),
    { storage: c.var.storage, githubApp: getGitHubAppConfig(c.env) },
  );

  const run = runBackgroundSync(settings, syncService);
  try {
    c.executionCtx?.waitUntil(run);
  } catch {
    // executionCtx not available (e.g. tests, Node) — let the promise
    // resolve on its own; HTTP response still returns immediately.
  }
}
