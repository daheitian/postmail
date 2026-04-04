---
name: jant-http-api
description: Automate a Jant site over HTTP. Use for creating and updating posts, uploading media, managing collections, editing settings, and running public or authenticated queries against the documented Jant API.
---

# Jant HTTP API

Use this skill when the task is better handled through the site's HTTP API than through the browser UI.

## Auth

Use one of these:

- session cookie from a signed-in browser
- `Authorization: Bearer jnt_...` API token
- local `DEV_API_TOKEN` on localhost-style hosts

## Prefer Local CLI First

When you already have shell access to the site directory, prefer the built-in `jant` CLI for common automation:

```bash
npx jant posts list --limit 20
npx jant posts create --input ./post.json
npx jant media upload ./photo.webp --alt "Cover image"
npx jant media list --mimePrefix image/
npx jant collections add-post col_... pst_...
npx jant settings get
npx jant search "quiet design"
```

The CLI uses the same site URL and token model as the HTTP API.

## Built-in MCP

Jant also exposes a built-in MCP endpoint at `/api/mcp`.

- auth: session cookie or `Authorization: Bearer jnt_...`
- tools: posts, media, collections, settings, and search
- protocol: streamable HTTP request/response shape with `initialize`, `tools/list`, and `tools/call`

Use MCP when the caller already speaks MCP. Use the CLI or plain HTTP when you just need a direct script.

Generated sites also include worked examples in `examples/agent-content-automation/`.

Base URL examples:

- local: `http://localhost:3000`
- production: `https://your-site.example`

## Post Automation

### Create a note

```bash
curl -X POST "$JANT_URL/api/posts" \
  -H "Authorization: Bearer $JANT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "note",
    "title": "Hello World",
    "bodyMarkdown": "A short note from the API.",
    "status": "published",
    "visibility": "public"
  }'
```

### Create a quote

```bash
curl -X POST "$JANT_URL/api/posts" \
  -H "Authorization: Bearer $JANT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "quote",
    "quoteText": "What stands in the way becomes the way.",
    "sourceName": "Marcus Aurelius",
    "bodyMarkdown": "Still worth rereading."
  }'
```

### Update a post

```bash
curl -X PUT "$JANT_URL/api/posts/pst_..." \
  -H "Authorization: Bearer $JANT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bodyMarkdown": "Updated body copy.",
    "featured": true
  }'
```

## Important Post Rules

- Use `bodyMarkdown` for scripts unless you already have trusted TipTap JSON.
- Use `body` or `bodyMarkdown`, never both.
- Use `slug` or `path`, never both. `path` is create-only.
- Link posts require `title` and `url`.
- Quote posts require `quoteText` and must use `sourceName` / `sourceUrl`.
- Replies use `replyToId` and inherit the thread's visibility rules.
- Sending `attachments` replaces the full attachment list.
- `GET /api/posts` returns replies as well as roots.

## Uploads

For scripted clients, prefer the local CLI:

```bash
npx jant media upload ./photo.webp --alt "Cover image"
```

For raw HTTP clients, use the recommended upload session flow:

1. `POST /api/uploads/init`
2. upload bytes to the returned transport
3. `POST /api/uploads/:id/complete`

For simple agent scripts, the legacy one-shot endpoint can be easier:

```bash
curl -X POST "$JANT_URL/api/upload" \
  -H "Authorization: Bearer $JANT_API_TOKEN" \
  -F "file=@./photo.jpg"
```

Use the returned `med_*` ID inside a post attachment:

```json
{
  "attachments": [{ "type": "media", "mediaId": "med_..." }]
}
```

Read text attachment markdown through:

```bash
curl "$JANT_URL/api/attachments/med_.../content" \
  -H "Authorization: Bearer $JANT_API_TOKEN"
```

## Collections

Create a collection:

```bash
curl -X POST "$JANT_URL/api/collections" \
  -H "Authorization: Bearer $JANT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "reading",
    "title": "Reading",
    "description": "Books and essays",
    "sortOrder": "newest"
  }'
```

Attach posts by sending `collectionIds` on post create or update.

## Settings

Read settings:

```bash
curl "$JANT_URL/api/settings" \
  -H "Authorization: Bearer $JANT_API_TOKEN"
```

Update settings:

```bash
curl -X PUT "$JANT_URL/api/settings" \
  -H "Authorization: Bearer $JANT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "SITE_NAME": "My Site",
    "TIME_ZONE": "Asia/Shanghai"
  }'
```

Settings values must be strings, including booleans and numbers.

## Public Queries

- Public posts: `GET /api/public/posts`
- Single public post: `GET /api/public/posts/:slug`
- Search: `GET /api/search?q=...`
- Collections: `GET /api/collections`

## Gotchas

1. `latest_hidden` posts are still readable by direct URL.
2. Quote responses use `sourceName` and `sourceUrl` instead of `title` and `url`.
3. Clearing a post rating on update uses `"rating": 0`.
4. Search snippets may contain `<mark>` tags. Treat them as trusted rendered snippet HTML, not plain text.
