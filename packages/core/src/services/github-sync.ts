/**
 * GitHub Sync Service
 *
 * Handles bidirectional content synchronization between Jant and a GitHub repo.
 * Posts are serialized as Zola-format Markdown files (reusing the export format).
 *
 * Push (Jant → GitHub):
 *   - Always full sync: regenerate Jant-managed files in a single atomic commit
 *   - Uses base_tree so untracked files in the repo (READMEs, CI, etc.) are preserved
 *   - Debounced: multiple rapid changes collapse into one sync
 *
 * Pull (GitHub → Jant):
 *   - Webhook-triggered: match modified files to existing posts by slug and update
 *   - Unknown files are skipped; new posts cannot be created from GitHub
 *   - File deletions are intentionally ignored to avoid catastrophic data loss
 *     (e.g. user deletes the repo → site wiped). Deletes must go through Jant's UI.
 *
 * Anti-loop: all commits from Jant include `[jant-sync]` in the message.
 * Incoming webhooks with this marker are skipped.
 */

import {
  createGitHubClient,
  parseRepoSlug,
  type GitHubClient,
  type GitHubPushEvent,
  type GitHubTreeItem,
} from "../lib/github-api.js";
import { getInstallationToken } from "../lib/github-app.js";
import type { GitHubAppEnvConfig } from "../lib/env.js";
import { parseFrontMatter, splitReplies } from "../lib/zola-markdown.js";
import { markdownToTiptapJson } from "../lib/markdown-to-tiptap.js";
import { createExportService, type SiteConfig } from "./export.js";
import type { PostService } from "./post.js";
import type { PathService } from "./path.js";
import type { CollectionService } from "./collection.js";
import type { MediaService } from "./media.js";
import type { SettingsService } from "./settings.js";
import type { StorageDriver } from "../lib/storage.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Marker included in commit messages to prevent webhook loops. */
export const SYNC_COMMIT_MARKER = "[jant-sync]";

/** Directory prefix for post files in the repo. */
const POST_DIR = "content/posts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GitHubSyncAuthMode = "pat" | "app";

export interface GitHubSyncConfig {
  /** Auth path: "pat" uses the stored token; "app" uses the GitHub App installation. */
  authMode: GitHubSyncAuthMode;
  /** PAT string (only set when `authMode === "pat"`). */
  token?: string;
  /** GitHub App installation id (only set when `authMode === "app"`). */
  installationId?: string;
  repo: string; // "owner/repo"
  enabled: boolean;
  webhookId?: string;
  webhookSecret?: string;
  lastPushSha?: string;
}

export interface GitHubSyncService {
  /** Get the current sync configuration from settings. */
  getConfig(): Promise<GitHubSyncConfig | null>;

  /** Full push: regenerate all files and commit atomically. */
  pushFullSync(): Promise<{ commitSha: string }>;

  /** Process an incoming GitHub webhook push event. */
  handleWebhookPush(payload: GitHubPushEvent): Promise<void>;

  /** Setup: create webhook on the GitHub repo. */
  setupWebhook(callbackUrl: string): Promise<{ webhookId: number }>;

  /** Teardown: remove webhook and clear config. */
  teardownWebhook(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createGitHubSyncService(
  services: {
    posts: PostService;
    paths: PathService;
    collections: CollectionService;
    media: MediaService;
    settings: SettingsService;
  },
  siteConfig: SiteConfig,
  deps: {
    storage?: StorageDriver | null;
    /** GitHub App env config — required to create clients in "app" auth mode. */
    githubApp?: GitHubAppEnvConfig | null;
  } = {},
): GitHubSyncService {
  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  async function loadConfig(): Promise<GitHubSyncConfig | null> {
    const [repo, enabled, authModeRaw] = await Promise.all([
      services.settings.get("GITHUB_SYNC_REPO"),
      services.settings.get("GITHUB_SYNC_ENABLED"),
      services.settings.get("GITHUB_SYNC_AUTH_MODE"),
    ]);

    if (!repo || enabled !== "true") return null;

    const authMode: GitHubSyncAuthMode = authModeRaw === "app" ? "app" : "pat";

    const [token, installationId, webhookId, webhookSecret, lastPushSha] =
      await Promise.all([
        services.settings.get("GITHUB_SYNC_TOKEN"),
        services.settings.get("GITHUB_SYNC_APP_INSTALLATION_ID"),
        services.settings.get("GITHUB_SYNC_WEBHOOK_ID"),
        services.settings.get("GITHUB_SYNC_WEBHOOK_SECRET"),
        services.settings.get("GITHUB_SYNC_LAST_PUSH_SHA"),
      ]);

    if (authMode === "pat" && !token) return null;
    if (authMode === "app" && !installationId) return null;

    return {
      authMode,
      token: token ?? undefined,
      installationId: installationId ?? undefined,
      repo,
      enabled: true,
      webhookId: webhookId ?? undefined,
      webhookSecret: webhookSecret ?? undefined,
      lastPushSha: lastPushSha ?? undefined,
    };
  }

  function createClient(config: GitHubSyncConfig): {
    client: GitHubClient;
    owner: string;
    repo: string;
  } {
    const parsed = parseRepoSlug(config.repo);
    if (!parsed) throw new Error(`Invalid repo slug: ${config.repo}`);

    let client: GitHubClient;
    if (config.authMode === "app") {
      if (!deps.githubApp) {
        throw new Error(
          "GitHub App is not configured on this deployment. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and GITHUB_APP_SLUG to use App auth.",
        );
      }
      if (!config.installationId) {
        throw new Error("GitHub App installation id is missing.");
      }
      const app = deps.githubApp;
      const installationId = config.installationId;
      client = createGitHubClient(() =>
        getInstallationToken(app, installationId),
      );
    } else {
      if (!config.token) {
        throw new Error("GitHub sync PAT is missing.");
      }
      client = createGitHubClient(config.token);
    }

    return { client, owner: parsed.owner, repo: parsed.repo };
  }

  /**
   * Get the HEAD SHA, initializing an empty repo if needed.
   * GitHub's Git Trees API requires at least one commit to exist.
   */
  async function getOrInitHead(
    client: GitHubClient,
    owner: string,
    repo: string,
    defaultBranch: string,
  ): Promise<{ sha: string; justInitialized: boolean }> {
    try {
      const ref = await client.getRef(owner, repo, `heads/${defaultBranch}`);
      return { sha: ref.sha, justInitialized: false };
    } catch {
      // Empty repo — seed it so the Git Trees API becomes available.
      // Use a hidden placeholder (not README.md) so the seed README from the
      // export service still lands on the follow-up push.
      await client.createOrUpdateFile(owner, repo, ".jant-init", {
        content: "",
        message: `Initialize repository ${SYNC_COMMIT_MARKER}`,
      });
      const ref = await client.getRef(owner, repo, `heads/${defaultBranch}`);
      return { sha: ref.sha, justInitialized: true };
    }
  }

  // -------------------------------------------------------------------
  // Service methods
  // -------------------------------------------------------------------

  return {
    getConfig: loadConfig,

    async pushFullSync() {
      const config = await loadConfig();
      if (!config) throw new Error("GitHub Sync is not configured");
      const { client, owner, repo } = createClient(config);

      // Generate full Zola site via the shared export service
      const exportService = createExportService(services, siteConfig, deps);
      const exportFiles = await exportService.generateZolaFiles();

      // Resolve HEAD before building the tree — needed both as the commit
      // parent / base_tree and to probe for existing "seed" files below.
      const repoInfo = await client.getRepo(owner, repo);
      const defaultBranch = repoInfo.default_branch;
      const { sha: headSha, justInitialized } = await getOrInitHead(
        client,
        owner,
        repo,
        defaultBranch,
      );

      // Seed files (e.g. .gitignore, README.md) are write-once: users are
      // expected to customize them, so we must not overwrite existing copies.
      // Probe HEAD in parallel and drop any that already exist. Skip the
      // probe entirely for repos we just initialized — only our own placeholder
      // is there, so every seed should be written.
      const seedFiles = exportFiles.filter((f) => f.managed === "seed");
      const existingSeedPaths = new Set<string>(
        justInitialized
          ? []
          : (
              await Promise.all(
                seedFiles.map(async (f) => {
                  const existing = await client.getFileContent(
                    owner,
                    repo,
                    f.path,
                    headSha,
                  );
                  return existing ? f.path : null;
                }),
              )
            ).filter((p): p is string => p !== null),
      );

      // Convert to Git tree items
      const treeItems: GitHubTreeItem[] = [];
      for (const file of exportFiles) {
        if (existingSeedPaths.has(file.path)) continue;
        if (typeof file.content === "string") {
          treeItems.push({
            path: file.path,
            mode: "100644",
            type: "blob",
            content: file.content,
          });
        } else {
          // Binary files need to be created as blobs first
          const blob = await client.createBlob(
            owner,
            repo,
            uint8ArrayToBase64(file.content),
            "base64",
          );
          treeItems.push({
            path: file.path,
            mode: "100644",
            type: "blob",
            sha: blob.sha,
          });
        }
      }

      // Base the new tree on the current HEAD's tree so files outside Jant's
      // managed paths (user-added READMEs, CI config, etc.) are preserved.
      const headCommit = await client.getCommit(owner, repo, headSha);
      const tree = await client.createTree(
        owner,
        repo,
        treeItems,
        headCommit.treeSha,
      );

      // Create commit
      const commit = await client.createCommit(owner, repo, {
        message: `Sync site ${SYNC_COMMIT_MARKER}`,
        tree: tree.sha,
        parents: [headSha],
      });

      // Update ref
      await client.updateRef(owner, repo, `heads/${defaultBranch}`, commit.sha);

      // Save last push SHA and timestamp
      await services.settings.set("GITHUB_SYNC_LAST_PUSH_SHA", commit.sha);
      await services.settings.set(
        "GITHUB_SYNC_LAST_PUSH_AT",
        String(Math.floor(Date.now() / 1000)),
      );

      return { commitSha: commit.sha };
    },

    async handleWebhookPush(payload) {
      // Skip commits from Jant itself
      const hasOwnCommits = payload.commits.some((c) =>
        c.message.includes(SYNC_COMMIT_MARKER),
      );
      if (hasOwnCommits && payload.commits.length === 1) return;

      // Collect modified/added post files from non-Jant commits.
      // Deletions are intentionally ignored — removing a file in Git must not
      // delete posts, so users can't wipe the site by deleting the repo.
      const modified = new Set<string>();

      for (const commit of payload.commits) {
        if (commit.message.includes(SYNC_COMMIT_MARKER)) continue;

        for (const file of [...commit.modified, ...commit.added]) {
          if (file.startsWith(`${POST_DIR}/`) && file.endsWith(".md")) {
            modified.add(file);
          }
        }
      }

      const config = await loadConfig();
      if (!config) return;
      const { client, owner, repo } = createClient(config);

      // Process modified files
      for (const filePath of modified) {
        const fileContent = await client.getFileContent(
          owner,
          repo,
          filePath,
          payload.after,
        );
        if (!fileContent) continue;

        // Decode base64 content
        const raw = decodeBase64Content(fileContent.content);
        const { frontMatter, body } = await parseFrontMatter(raw);

        const slug = frontMatter.slug;
        if (!slug) continue;

        // Find existing post by slug
        const pathRecord = await services.paths.getByPath(slug);
        if (!pathRecord?.postId) continue;

        const existingPost = await services.posts.getById(pathRecord.postId);
        if (!existingPost) continue;

        // Parse body (handle thread replies)
        const segments = splitReplies(body);
        const rootBody = segments[0]?.body ?? "";

        // Convert markdown to Tiptap JSON
        const tiptapBody = rootBody ? markdownToTiptapJson(rootBody) : null;

        // Build update data from front matter
        const updateData: Record<string, unknown> = {};
        if (tiptapBody !== null) updateData.body = tiptapBody;
        if (frontMatter.title !== undefined)
          updateData.title = frontMatter.title;
        if (frontMatter.extra?.link_url !== undefined) {
          updateData.url = frontMatter.extra.link_url;
        }
        if (frontMatter.extra?.quote_text !== undefined) {
          updateData.quoteText = frontMatter.extra.quote_text;
        }

        if (Object.keys(updateData).length > 0) {
          await services.posts.update(existingPost.id, updateData);
        }
      }
    },

    async setupWebhook(callbackUrl) {
      const config = await loadConfig();
      if (!config) throw new Error("GitHub Sync is not configured");
      const { client, owner, repo } = createClient(config);

      // Generate a random webhook secret
      const secretBytes = new Uint8Array(32);
      crypto.getRandomValues(secretBytes);
      const secret = Array.from(secretBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const webhook = await client.createWebhook(owner, repo, {
        url: callbackUrl,
        secret,
        events: ["push"],
      });

      // Save webhook config
      await services.settings.set("GITHUB_SYNC_WEBHOOK_SECRET", secret);
      await services.settings.set("GITHUB_SYNC_WEBHOOK_ID", String(webhook.id));

      return { webhookId: webhook.id };
    },

    async teardownWebhook() {
      const config = await loadConfig();
      if (!config) return;

      if (config.webhookId) {
        try {
          const { client, owner, repo } = createClient(config);
          await client.deleteWebhook(owner, repo, parseInt(config.webhookId));
        } catch {
          // Webhook may already be gone — ignore errors
        }
      }

      // Clear all sync settings
      await services.settings.set("GITHUB_SYNC_ENABLED", "false");
      await services.settings.set("GITHUB_SYNC_TOKEN", "");
      await services.settings.set("GITHUB_SYNC_REPO", "");
      await services.settings.set("GITHUB_SYNC_WEBHOOK_SECRET", "");
      await services.settings.set("GITHUB_SYNC_WEBHOOK_ID", "");
      await services.settings.set("GITHUB_SYNC_LAST_PUSH_SHA", "");
      await services.settings.set("GITHUB_SYNC_AUTH_MODE", "pat");
      await services.settings.set("GITHUB_SYNC_APP_INSTALLATION_ID", "");
    },
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function decodeBase64Content(content: string): string {
  // GitHub API returns base64 with newlines for readability
  const cleaned = content.replace(/\n/g, "");
  return decodeURIComponent(escape(atob(cleaned)));
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
