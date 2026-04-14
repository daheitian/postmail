# GitHub Sync

GitHub Sync backs up your posts to a GitHub repository as Markdown files and optionally pulls edits back. Every post change creates a commit, giving you a full Git history of your content.

You keep writing in Jant as usual. GitHub is the backup and version-control layer.

A GitHub repository also serves as a file-based interface for AI tools. Jant provides an [API](API.md) and an [MCP server](https://github.com/jant-me/jant/blob/main/docs/internal/coding-standards.md) for programmatic access, but many AI agents and coding assistants work most naturally with plain files. A synced repository gives them a directory of Markdown files they can read, edit, and commit — no API client required.

## How It Works

**Jant to GitHub** — When you create, edit, or delete a post, Jant pushes the change to your repository as a Markdown file with YAML front matter. Thread replies are embedded in the root post file. Media stays where it is (referenced by URL, not copied into the repo).

**GitHub to Jant** — When you edit a Markdown file on GitHub and push, a webhook notifies Jant. Jant parses the file, matches it to an existing post by slug, and updates the content. Deleting a file on GitHub soft-deletes the matching post.

Jant marks its own commits with `[jant-sync]` in the commit message. Incoming webhooks with that marker are skipped, so changes never bounce back and forth.

### What Syncs

- Post body (Markdown)
- Title, URL, quote text, and other front matter fields
- Thread replies (merged into the root post file)

### What Does Not Sync from GitHub

- New posts cannot be created by adding files on GitHub. Only existing posts are updated.
- Media attachments are not modified. They remain at their original URLs.
- Settings, navigation, collections, and themes are not affected by incoming webhooks.

## Prerequisites

You need a GitHub **fine-grained Personal Access Token** (PAT) with these permissions on the target repository:

| Permission   | Access     | Why                          |
| ------------ | ---------- | ---------------------------- |
| **Contents** | Read/Write | Push and read Markdown files |
| **Webhooks** | Read/Write | Auto-create the push webhook |

Create the token at [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta). Scope it to a single repository for least privilege.

## Setup

1. Create a repository on GitHub (public or private, either works).
2. Open **Settings > Data > GitHub Sync** in your Jant dashboard.
3. Paste your token and enter the repository as `owner/repo`.
4. Click **Connect**.

Jant validates the token, saves the configuration, and creates a webhook on the repository. No manual webhook setup required.

## Push a Full Sync

After connecting, click **Push Full Sync** to populate the repository with all your posts. This creates a single commit containing every post as a Markdown file under `content/posts/`.

You can re-run a full sync at any time. It replaces the repository content in one atomic commit. Git treats unchanged files as no-ops, so your blame history is preserved for files that did not change.

## Incremental Sync

Once connected, every post create, edit, or delete in Jant automatically pushes the change to GitHub. Each mutation produces its own commit.

- **Create or update**: writes `content/posts/{slug}.md`
- **Delete**: removes the file from the repository
- **Thread reply changes**: re-sync the root post file (replies are embedded)

Incremental syncs run in the background and do not block the Jant UI.

## Editing on GitHub

You can edit any `content/posts/*.md` file directly on GitHub (or locally and push). When the push reaches GitHub, the webhook fires and Jant updates the matching post.

Matching works by slug: Jant reads the `slug` field from the YAML front matter and looks up the corresponding post. If no match is found, the file is skipped.

Only the following fields are updated from GitHub edits:

- `body` (the Markdown content below the front matter)
- `title`
- `extra.link_url` (for link posts)
- `extra.quote_text` (for quote posts)

Deleting a file on GitHub soft-deletes the post in Jant.

## Disconnect

Open **Settings > Data > GitHub Sync** and click **Disconnect**. Jant removes the webhook from GitHub and clears the sync configuration. The repository and its content are not deleted.

## File Format

Posts are stored as Zola-compatible Markdown with YAML front matter, the same format used by [Site Export](export-and-import.md).

```markdown
---
title: "Hello World"
date: 2025-01-15T12:00:00Z
slug: "hello-world"
extra:
  format: note
  status: published
  visibility: public
---

Post content here.
```

Thread replies appear as HTML comment markers within the same file:

```markdown
<!-- jant:reply date="2025-01-15T13:00:00Z" slug="reply-abc" format="note" status="published" visibility="public" -->

Reply content here.
```

## Queue and Background Processing

Sync operations run asynchronously to avoid blocking your writing flow.

- **Cloudflare Workers**: uses Cloudflare Queues when the `GITHUB_SYNC_QUEUE` binding is configured. Add the binding to your `wrangler.toml`:

  ```toml
  [[queues.producers]]
  binding = "GITHUB_SYNC_QUEUE"
  queue = "jant-github-sync"

  [[queues.consumers]]
  queue = "jant-github-sync"
  max_batch_size = 1
  ```

- **Node / Docker**: uses a database-backed job queue (`sync_job` table) with automatic polling. No extra configuration needed.

- **Without a queue**: if no queue is configured on Cloudflare, incremental syncs are skipped. Full syncs triggered from the dashboard still work (they run inline).

## Limitations

- **One repository per site.** Multi-repo sync is not supported.
- **No post creation from GitHub.** Adding a new `.md` file on GitHub does not create a post in Jant. Only existing posts can be updated or deleted.
- **Text attachments are not synced.** Media and text attachment content are referenced by URL only.
- **Rate limits.** GitHub allows 5,000 API requests per hour for authenticated users. A full sync of 1,000 posts uses roughly 1,000 requests (one blob per file). Incremental syncs use 1-2 requests each.

## Related Reading

- [Export and Import](export-and-import.md)
- [Backups and Recovery](backups.md)
- [Configuration](configuration.md)
- [API Reference](API.md)
