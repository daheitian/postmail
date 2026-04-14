/**
 * GitHub Sync Service
 *
 * Handles bidirectional content synchronization between Jant and a GitHub repo.
 * Posts are serialized as Zola-format Markdown files (reusing the export format).
 *
 * Push (Jant → GitHub):
 *   - Full sync: regenerate all files in a single atomic commit via Git Trees API
 *   - Incremental: update/delete a single post file via Contents API
 *
 * Pull (GitHub → Jant):
 *   - Webhook-triggered: match files to existing posts by slug, update or delete
 *   - Unknown files are skipped; new posts cannot be created from GitHub
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
import { parseFrontMatter, splitReplies } from "../lib/zola-markdown.js";
import { markdownToTiptapJson } from "../lib/markdown-to-tiptap.js";
import { buildPostMarkdown, type SiteConfig } from "./export.js";
import type { PostService } from "./post.js";
import type { PathService } from "./path.js";
import type { CollectionService } from "./collection.js";
import type { MediaService } from "./media.js";
import type { SettingsService } from "./settings.js";
import type {
  Post,
  Collection,
  Media,
  TextAttachmentContent,
} from "../types.js";

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

export interface GitHubSyncConfig {
  token: string;
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

  /** Incremental: push a single post change. */
  pushPostChange(postId: string, action: "upsert" | "delete"): Promise<void>;

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
): GitHubSyncService {
  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  async function loadConfig(): Promise<GitHubSyncConfig | null> {
    const [token, repo, enabled] = await Promise.all([
      services.settings.get("GITHUB_SYNC_TOKEN"),
      services.settings.get("GITHUB_SYNC_REPO"),
      services.settings.get("GITHUB_SYNC_ENABLED"),
    ]);

    if (!token || !repo || enabled !== "true") return null;

    const [webhookId, webhookSecret, lastPushSha] = await Promise.all([
      services.settings.get("GITHUB_SYNC_WEBHOOK_ID"),
      services.settings.get("GITHUB_SYNC_WEBHOOK_SECRET"),
      services.settings.get("GITHUB_SYNC_LAST_PUSH_SHA"),
    ]);

    return {
      token,
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
    return {
      client: createGitHubClient(config.token),
      owner: parsed.owner,
      repo: parsed.repo,
    };
  }

  /**
   * Load all data needed to serialize a single post (+ thread replies).
   */
  async function loadPostExportData(postId: string): Promise<{
    root: Post;
    threadReplies: Post[];
    postCollections: Collection[];
    rootAliases: string[];
    slug: string;
    slugMap: Map<string, string>;
    collectionSlugMap: Map<string, string>;
    rootMedia: Media[];
    mediaByPost: Map<string, Media[]>;
    textAttachmentContents: Map<string, TextAttachmentContent>;
  } | null> {
    const root = await services.posts.getById(postId);
    if (!root) return null;

    // For thread roots, load the whole thread
    const thread = await services.posts.getThread(root.threadId);
    const threadReplies = thread
      .filter((p) => p.replyToId !== null)
      .sort((a, b) => a.createdAt - b.createdAt);

    const allIds = [root.id, ...threadReplies.map((r) => r.id)];

    const [collectionsByPost, mediaByPost, slugMap, aliasMap] =
      await Promise.all([
        services.collections.getCollectionsByPostIds([root.id]),
        services.media.getByPostIds(allIds),
        services.paths.getPostSlugMap(allIds),
        services.paths.getPostAliases([root.id]),
      ]);

    const postCollections = collectionsByPost.get(root.id) ?? [];
    const collectionIds = postCollections.map((c) => c.id);
    const collectionSlugMap =
      collectionIds.length > 0
        ? await services.paths.getCollectionSlugMap(collectionIds)
        : new Map<string, string>();

    // Text attachment contents (empty map — we don't download text attachments for sync)
    const textAttachmentContents = new Map<string, TextAttachmentContent>();

    return {
      root,
      threadReplies,
      postCollections,
      rootAliases: [...(aliasMap.get(root.id) ?? [])],
      slug: slugMap.get(root.id) ?? root.slug,
      slugMap,
      collectionSlugMap,
      rootMedia: mediaByPost.get(root.id) ?? [],
      mediaByPost,
      textAttachmentContents,
    };
  }

  function serializePost(data: Awaited<ReturnType<typeof loadPostExportData>>) {
    if (!data) return null;

    const zolaAliases = [...data.rootAliases];
    for (const reply of data.threadReplies) {
      const replySlug = data.slugMap.get(reply.id) ?? reply.slug;
      zolaAliases.push(`/${replySlug}`);
    }

    return buildPostMarkdown(
      data.root,
      data.threadReplies,
      data.postCollections,
      { rootAliases: data.rootAliases, zolaAliases },
      data.slugMap,
      data.collectionSlugMap,
      data.rootMedia,
      data.mediaByPost,
      siteConfig,
      data.textAttachmentContents,
    );
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

      // Load all posts
      const allPosts = await services.posts.list({
        excludeReplies: false,
        limit: 10000,
      });
      const roots = allPosts.filter((p) => p.replyToId === null);

      const allPostIds = allPosts.map((p) => p.id);
      const rootPostIds = roots.map((p) => p.id);

      const [
        collectionsByPost,
        mediaByPost,
        slugMap,
        aliasMap,
        allCollections,
      ] = await Promise.all([
        services.collections.getCollectionsByPostIds(allPostIds),
        services.media.getByPostIds(allPostIds),
        services.paths.getPostSlugMap(allPostIds),
        services.paths.getPostAliases(rootPostIds),
        services.collections.list(),
      ]);

      const collectionSlugMap = await services.paths.getCollectionSlugMap(
        allCollections.map((c) => c.id),
      );

      // Empty text attachment map — text attachments are not downloaded for sync
      const textAttachmentContents = new Map<string, TextAttachmentContent>();

      // Group replies by thread
      const repliesByThread = new Map<string, Post[]>();
      for (const post of allPosts) {
        if (post.replyToId !== null) {
          const list = repliesByThread.get(post.threadId) ?? [];
          list.push(post);
          repliesByThread.set(post.threadId, list);
        }
      }
      for (const list of repliesByThread.values()) {
        list.sort((a, b) => a.createdAt - b.createdAt);
      }

      // Build tree items for all posts
      const treeItems: GitHubTreeItem[] = [];
      const sc = siteConfig;

      for (const root of roots) {
        const slug = slugMap.get(root.id) ?? root.slug;
        const threadReplies = repliesByThread.get(root.id) ?? [];
        const postCollections = collectionsByPost.get(root.id) ?? [];
        const rootAliases = [...(aliasMap.get(root.id) ?? [])];
        const zolaAliases = [...rootAliases];
        for (const reply of threadReplies) {
          zolaAliases.push(`/${slugMap.get(reply.id) ?? reply.slug}`);
        }

        const markdown = buildPostMarkdown(
          root,
          threadReplies,
          postCollections,
          { rootAliases, zolaAliases },
          slugMap,
          collectionSlugMap,
          mediaByPost.get(root.id) ?? [],
          mediaByPost,
          sc,
          textAttachmentContents,
        );

        treeItems.push({
          path: `${POST_DIR}/${slug}.md`,
          mode: "100644",
          type: "blob",
          content: markdown,
        });
      }

      // Get current HEAD
      const repoInfo = await client.getRepo(owner, repo);
      const defaultBranch = repoInfo.default_branch;
      const headRef = await client.getRef(
        owner,
        repo,
        `heads/${defaultBranch}`,
      );

      // Create a new tree (NOT based on existing tree — this replaces everything)
      const tree = await client.createTree(owner, repo, treeItems);

      // Create commit
      const commit = await client.createCommit(owner, repo, {
        message: `Sync all posts ${SYNC_COMMIT_MARKER}`,
        tree: tree.sha,
        parents: [headRef.sha],
      });

      // Update ref
      await client.updateRef(owner, repo, `heads/${defaultBranch}`, commit.sha);

      // Save last push SHA
      await services.settings.set("GITHUB_SYNC_LAST_PUSH_SHA", commit.sha);

      return { commitSha: commit.sha };
    },

    async pushPostChange(postId, action) {
      const config = await loadConfig();
      if (!config) return;
      const { client, owner, repo } = createClient(config);

      if (action === "delete") {
        // We need the slug to find the file. Try to look it up via paths.
        const slugMap = await services.paths.getPostSlugMap([postId]);
        const slug = slugMap.get(postId);
        if (!slug) return; // Post already fully deleted, nothing to do

        const filePath = `${POST_DIR}/${slug}.md`;
        const existing = await client.getFileContent(owner, repo, filePath);
        if (!existing) return; // File doesn't exist on GitHub

        await client.deleteFile(owner, repo, filePath, {
          sha: existing.sha,
          message: `Delete post: ${slug} ${SYNC_COMMIT_MARKER}`,
        });
        return;
      }

      // Upsert
      const data = await loadPostExportData(postId);
      if (!data) return;

      // Skip replies — they're embedded in the root post file
      if (data.root.replyToId !== null) {
        // Instead, re-sync the root post
        const rootData = await loadPostExportData(data.root.threadId);
        if (!rootData) return;
        const markdown = serializePost(rootData);
        if (!markdown) return;

        const filePath = `${POST_DIR}/${rootData.slug}.md`;
        const existing = await client.getFileContent(owner, repo, filePath);
        await client.createOrUpdateFile(owner, repo, filePath, {
          content: markdown,
          message: `Update thread: ${rootData.slug} ${SYNC_COMMIT_MARKER}`,
          sha: existing?.sha,
        });
        return;
      }

      const markdown = serializePost(data);
      if (!markdown) return;

      const filePath = `${POST_DIR}/${data.slug}.md`;
      const existing = await client.getFileContent(owner, repo, filePath);

      await client.createOrUpdateFile(owner, repo, filePath, {
        content: markdown,
        message: `${existing ? "Update" : "Add"} post: ${data.slug} ${SYNC_COMMIT_MARKER}`,
        sha: existing?.sha,
      });
    },

    async handleWebhookPush(payload) {
      // Skip commits from Jant itself
      const hasOwnCommits = payload.commits.some((c) =>
        c.message.includes(SYNC_COMMIT_MARKER),
      );
      if (hasOwnCommits && payload.commits.length === 1) return;

      // Collect all file changes from non-Jant commits
      const modified = new Set<string>();
      const removed = new Set<string>();

      for (const commit of payload.commits) {
        if (commit.message.includes(SYNC_COMMIT_MARKER)) continue;

        for (const file of commit.modified) {
          if (file.startsWith(`${POST_DIR}/`) && file.endsWith(".md")) {
            modified.add(file);
            removed.delete(file);
          }
        }
        for (const file of commit.added) {
          if (file.startsWith(`${POST_DIR}/`) && file.endsWith(".md")) {
            // Added files are treated like modified — but we only update existing posts
            modified.add(file);
            removed.delete(file);
          }
        }
        for (const file of commit.removed) {
          if (file.startsWith(`${POST_DIR}/`) && file.endsWith(".md")) {
            removed.add(file);
            modified.delete(file);
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

      // Process removed files
      for (const filePath of removed) {
        // Extract slug from path: "content/posts/{slug}.md"
        const slug = filePath.slice(`${POST_DIR}/`.length).replace(/\.md$/, "");
        if (!slug) continue;

        const pathRecord = await services.paths.getByPath(slug);
        if (!pathRecord?.postId) continue;

        // Soft-delete the post
        await services.posts.delete(pathRecord.postId);
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
