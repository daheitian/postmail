/**
 * GitHub Sync API Routes
 *
 * Webhook receiver (HMAC-verified, no session auth) and admin endpoints
 * (session/token auth) for managing GitHub Sync configuration.
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import { verifyGitHubWebhookSignature } from "../../lib/webhook-signature.js";
import { resolveJobQueue } from "../../lib/github-sync-trigger.js";
import { createGitHubClient, parseRepoSlug } from "../../lib/github-api.js";
import {
  createGitHubSyncService,
  SYNC_COMMIT_MARKER,
} from "../../services/github-sync.js";
import type { SiteConfig } from "../../services/export.js";
import type { GitHubPushEvent } from "../../lib/github-api.js";
import { parseValidated } from "../../lib/schemas.js";
import { getGitHubAppConfig } from "../../lib/env.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

// ---------------------------------------------------------------------------
// Webhook receiver — mounted in "no config" section
// ---------------------------------------------------------------------------

export const githubSyncWebhookRoutes = new Hono<Env>();

githubSyncWebhookRoutes.post("/webhook", async (c) => {
  // Prefer an app-level webhook secret when configured (GitHub App deployments
  // can set a single shared secret on the App and skip per-site secrets);
  // otherwise fall back to the per-site secret saved during setup.
  const app = getGitHubAppConfig(c.env);
  const secret =
    app?.webhookSecret ??
    (await c.var.services.settings.get("GITHUB_SYNC_WEBHOOK_SECRET"));
  if (!secret) {
    return c.json({ error: "GitHub Sync not configured" }, 404);
  }

  const signature = c.req.header("X-Hub-Signature-256") ?? "";
  const rawBody = await c.req.text();

  const valid = await verifyGitHubWebhookSignature(rawBody, signature, secret);
  if (!valid) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  // Only process push events
  const event = c.req.header("X-GitHub-Event");
  if (event !== "push") {
    return c.json({ ok: true, skipped: "not a push event" });
  }

  const payload = JSON.parse(rawBody) as GitHubPushEvent;

  // Skip commits from Jant itself (anti-loop)
  const allJantCommits = payload.commits.every((commit) =>
    commit.message.includes(SYNC_COMMIT_MARKER),
  );
  if (allJantCommits && payload.commits.length > 0) {
    return c.json({ ok: true, skipped: "jant-sync commits" });
  }

  // Enqueue pull job
  const queue = resolveJobQueue(c.env);
  await queue.enqueue({
    kind: "github-sync-pull",
    siteId: c.var.currentSite.id,
    data: {
      ref: payload.ref,
      before: payload.before,
      after: payload.after,
      commits: payload.commits,
    },
  });

  return c.json({ ok: true, queued: true });
});

// ---------------------------------------------------------------------------
// Admin endpoints — mounted in "needs config" section
// ---------------------------------------------------------------------------

export const githubSyncAdminRoutes = new Hono<Env>();

const ConnectSchema = z.object({
  token: z.string().min(1),
  repo: z.string().min(3), // "o/r" minimum
});

// Connect: validate token, save config, create webhook
githubSyncAdminRoutes.post("/setup", requireAuthApi(), async (c) => {
  // PAT connect is disabled when a GitHub App is configured — see the
  // dashboard route for rationale.
  if (getGitHubAppConfig(c.env)) {
    return c.json(
      {
        error:
          "This deployment uses GitHub App authentication. Use the App install flow instead.",
      },
      400,
    );
  }

  const body = parseValidated(ConnectSchema, await c.req.json());
  const parsed = parseRepoSlug(body.repo);
  if (!parsed) {
    return c.json({ error: "Invalid repository format. Use owner/repo." }, 400);
  }

  // Validate token by fetching repo info
  const client = createGitHubClient(body.token);
  try {
    await client.getRepo(parsed.owner, parsed.repo);
  } catch {
    return c.json(
      {
        error:
          "Could not access the repository. Check your token and repo name.",
      },
      400,
    );
  }

  // Save token and repo
  await c.var.services.settings.set("GITHUB_SYNC_TOKEN", body.token);
  await c.var.services.settings.set("GITHUB_SYNC_REPO", body.repo);
  await c.var.services.settings.set("GITHUB_SYNC_AUTH_MODE", "pat");
  await c.var.services.settings.set("GITHUB_SYNC_APP_INSTALLATION_ID", "");
  await c.var.services.settings.set("GITHUB_SYNC_ENABLED", "true");

  // Build webhook callback URL
  const siteUrl = c.var.appConfig.siteUrl;
  const callbackUrl = `${siteUrl}/api/github-sync/webhook`;

  // Create webhook via the sync service
  const syncService = createGitHubSyncService(
    c.var.services,
    c.var.currentSite.id,
    buildSiteConfigFromContext(c),
    { githubApp: getGitHubAppConfig(c.env) },
  );
  const { webhookId } = await syncService.setupWebhook(callbackUrl);

  return c.json({ ok: true, repo: body.repo, webhookId });
});

// Trigger full push sync
githubSyncAdminRoutes.post("/push", requireAuthApi(), async (c) => {
  const syncService = createGitHubSyncService(
    c.var.services,
    c.var.currentSite.id,
    buildSiteConfigFromContext(c),
    { githubApp: getGitHubAppConfig(c.env) },
  );

  const config = await syncService.getConfig();
  if (!config) {
    return c.json({ error: "GitHub Sync not configured" }, 400);
  }

  const { commitSha } = await syncService.pushFullSync();
  return c.json({ ok: true, commitSha });
});

// Disconnect: remove webhook, clear config
githubSyncAdminRoutes.delete("/", requireAuthApi(), async (c) => {
  const syncService = createGitHubSyncService(
    c.var.services,
    c.var.currentSite.id,
    buildSiteConfigFromContext(c),
    { githubApp: getGitHubAppConfig(c.env) },
  );
  await syncService.teardownWebhook();
  return c.json({ ok: true });
});

// Get sync status
githubSyncAdminRoutes.get("/status", requireAuthApi(), async (c) => {
  const [
    enabled,
    repo,
    lastPushSha,
    webhookId,
    lastPushAt,
    pending,
    lastError,
  ] = await Promise.all([
    c.var.services.settings.get("GITHUB_SYNC_ENABLED"),
    c.var.services.settings.get("GITHUB_SYNC_REPO"),
    c.var.services.settings.get("GITHUB_SYNC_LAST_PUSH_SHA"),
    c.var.services.settings.get("GITHUB_SYNC_WEBHOOK_ID"),
    c.var.services.settings.get("GITHUB_SYNC_LAST_PUSH_AT"),
    c.var.services.settings.get("GITHUB_SYNC_PENDING"),
    c.var.services.settings.get("GITHUB_SYNC_LAST_ERROR"),
  ]);

  return c.json({
    enabled: enabled === "true",
    repo: repo ?? null,
    lastPushSha: lastPushSha ?? null,
    webhookId: webhookId ?? null,
    lastPushAt: lastPushAt ? Number(lastPushAt) : null,
    pending: pending === "true",
    lastError: lastError || null,
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSiteConfigFromContext(c: {
  var: {
    appConfig: AppVariables["appConfig"];
    allSettings: Record<string, string>;
  };
}): SiteConfig {
  const cfg = c.var.appConfig;
  return {
    siteName: cfg.siteName,
    siteUrl: cfg.siteUrl,
    siteDescription: cfg.siteDescription,
    siteLanguage: cfg.siteLanguage,
    showJantBrandingOnHome: cfg.showJantBrandingOnHome,
    homeDefaultView: cfg.homeDefaultView,
    siteFooter: cfg.siteFooter,
    showHeaderAvatar: cfg.showHeaderAvatar,
    siteAvatarUrl: cfg.siteAvatarUrl,
    themeId: cfg.themeId,
    defaultThemeId: cfg.defaultThemeId,
    fontThemeId: cfg.fontThemeId,
    themeMode: cfg.themeMode,
    noindex: cfg.noindex,
    customCss: cfg.customCSS,
    r2PublicUrl: cfg.r2PublicUrl,
    s3PublicUrl: cfg.s3PublicUrl,
    localPublicUrl: cfg.localPublicUrl,
    imageTransformUrl: cfg.imageTransformUrl,
    sitePathPrefix: cfg.sitePathPrefix,
    navItems: [],
    pageSize: cfg.pageSize,
  };
}
