/**
 * GitHub REST API client for content sync.
 *
 * Pure fetch-based — no npm dependencies. Works in both Cloudflare Workers
 * and Node 18+.
 */

const API_BASE = "https://api.github.com";

const COMMON_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "jant-github-sync",
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GitHubRepo {
  default_branch: string;
  full_name: string;
}

export interface GitHubRef {
  sha: string;
}

export interface GitHubFileContent {
  sha: string;
  content: string;
  encoding: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: "100644" | "100755" | "040000" | "160000" | "120000";
  type: "blob" | "tree" | "commit";
  sha?: string | null;
  content?: string;
}

export interface GitHubTree {
  sha: string;
  tree: GitHubTreeItem[];
}

export interface GitHubCommit {
  sha: string;
}

export interface GitHubWebhook {
  id: number;
}

export interface GitHubPushEventCommit {
  id: string;
  message: string;
  added: string[];
  modified: string[];
  removed: string[];
}

export interface GitHubPushEvent {
  ref: string;
  before: string;
  after: string;
  commits: GitHubPushEventCommit[];
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly url: string,
  ) {
    super(`GitHub API ${status}: ${body} (${url})`);
    this.name = "GitHubApiError";
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface GitHubClient {
  /** Validate token and get repo metadata. */
  getRepo(owner: string, repo: string): Promise<GitHubRepo>;

  /** Get a ref (e.g. "heads/main") SHA. */
  getRef(owner: string, repo: string, ref: string): Promise<GitHubRef>;

  /** Get a commit's tree SHA. */
  getCommit(
    owner: string,
    repo: string,
    sha: string,
  ): Promise<{ sha: string; treeSha: string }>;

  /** Update a ref to point to a new SHA. */
  updateRef(
    owner: string,
    repo: string,
    ref: string,
    sha: string,
  ): Promise<void>;

  /** Create a new ref (e.g. for empty repos). */
  createRef(
    owner: string,
    repo: string,
    ref: string,
    sha: string,
  ): Promise<void>;

  /** Get file content at a path. Returns null if file doesn't exist. */
  getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<GitHubFileContent | null>;

  /** Create or update a single file via the Contents API. */
  createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    opts: {
      content: string;
      message: string;
      sha?: string;
      branch?: string;
    },
  ): Promise<{ sha: string }>;

  /** Delete a single file via the Contents API. */
  deleteFile(
    owner: string,
    repo: string,
    path: string,
    opts: {
      sha: string;
      message: string;
      branch?: string;
    },
  ): Promise<void>;

  /** Create a Git blob (for binary content). */
  createBlob(
    owner: string,
    repo: string,
    content: string,
    encoding: "utf-8" | "base64",
  ): Promise<{ sha: string }>;

  /** Create a Git tree object. */
  createTree(
    owner: string,
    repo: string,
    items: GitHubTreeItem[],
    baseTree?: string,
  ): Promise<GitHubTree>;

  /** Create a Git commit object. */
  createCommit(
    owner: string,
    repo: string,
    opts: {
      message: string;
      tree: string;
      parents: string[];
    },
  ): Promise<GitHubCommit>;

  /** Create a webhook on the repo. */
  createWebhook(
    owner: string,
    repo: string,
    opts: {
      url: string;
      secret: string;
      events: string[];
    },
  ): Promise<GitHubWebhook>;

  /** List webhooks on the repo. */
  listWebhooks(
    owner: string,
    repo: string,
  ): Promise<Array<{ id: number; config: { url?: string } }>>;

  /** Delete a webhook from the repo. */
  deleteWebhook(owner: string, repo: string, hookId: number): Promise<void>;
}

/**
 * Create a GitHub API client authenticated with a Personal Access Token.
 */
export function createGitHubClient(token: string): GitHubClient {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        ...COMMON_HEADERS,
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new GitHubApiError(res.status, text, url);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async function requestOrNull<T>(
    method: string,
    path: string,
  ): Promise<T | null> {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        ...COMMON_HEADERS,
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      throw new GitHubApiError(res.status, text, url);
    }

    return (await res.json()) as T;
  }

  return {
    async getRepo(owner, repo) {
      return request<GitHubRepo>("GET", `/repos/${owner}/${repo}`);
    },

    async getRef(owner, repo, ref) {
      const data = await request<{ object: { sha: string } }>(
        "GET",
        `/repos/${owner}/${repo}/git/ref/${ref}`,
      );
      return { sha: data.object.sha };
    },

    async getCommit(owner, repo, sha) {
      const data = await request<{ sha: string; tree: { sha: string } }>(
        "GET",
        `/repos/${owner}/${repo}/git/commits/${sha}`,
      );
      return { sha: data.sha, treeSha: data.tree.sha };
    },

    async updateRef(owner, repo, ref, sha) {
      await request("PATCH", `/repos/${owner}/${repo}/git/refs/${ref}`, {
        sha,
        force: false,
      });
    },

    async createRef(owner, repo, ref, sha) {
      await request("POST", `/repos/${owner}/${repo}/git/refs`, {
        ref: `refs/${ref}`,
        sha,
      });
    },

    async getFileContent(owner, repo, path, ref) {
      const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      return requestOrNull<GitHubFileContent>(
        "GET",
        `/repos/${owner}/${repo}/contents/${path}${query}`,
      );
    },

    async createOrUpdateFile(owner, repo, path, opts) {
      const body: Record<string, unknown> = {
        message: opts.message,
        content: btoa(unescape(encodeURIComponent(opts.content))),
      };
      if (opts.sha) body.sha = opts.sha;
      if (opts.branch) body.branch = opts.branch;

      const data = await request<{ content: { sha: string } }>(
        "PUT",
        `/repos/${owner}/${repo}/contents/${path}`,
        body,
      );
      return { sha: data.content.sha };
    },

    async deleteFile(owner, repo, path, opts) {
      await request("DELETE", `/repos/${owner}/${repo}/contents/${path}`, {
        message: opts.message,
        sha: opts.sha,
        ...(opts.branch ? { branch: opts.branch } : {}),
      });
    },

    async createBlob(owner, repo, content, encoding) {
      return request<{ sha: string }>(
        "POST",
        `/repos/${owner}/${repo}/git/blobs`,
        { content, encoding },
      );
    },

    async createTree(owner, repo, items, baseTree) {
      return request<GitHubTree>("POST", `/repos/${owner}/${repo}/git/trees`, {
        tree: items,
        ...(baseTree ? { base_tree: baseTree } : {}),
      });
    },

    async createCommit(owner, repo, opts) {
      return request<GitHubCommit>(
        "POST",
        `/repos/${owner}/${repo}/git/commits`,
        {
          message: opts.message,
          tree: opts.tree,
          parents: opts.parents,
        },
      );
    },

    async createWebhook(owner, repo, opts) {
      return request<GitHubWebhook>("POST", `/repos/${owner}/${repo}/hooks`, {
        name: "web",
        active: true,
        events: opts.events,
        config: {
          url: opts.url,
          secret: opts.secret,
          content_type: "json",
          insecure_ssl: "0",
        },
      });
    },

    async listWebhooks(owner, repo) {
      return request<Array<{ id: number; config: { url?: string } }>>(
        "GET",
        `/repos/${owner}/${repo}/hooks`,
      );
    },

    async deleteWebhook(owner, repo, hookId) {
      await request("DELETE", `/repos/${owner}/${repo}/hooks/${hookId}`);
    },
  };
}

/**
 * Parse an `owner/repo` string into its parts.
 *
 * @returns `{ owner, repo }` or `null` if the format is invalid.
 */
export function parseRepoSlug(
  slug: string,
): { owner: string; repo: string } | null {
  const match = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/.exec(slug.trim());
  if (!match) return null;
  return { owner: match[1]!, repo: match[2]! };
}
