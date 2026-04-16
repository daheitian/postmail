# Text Attachment Storage Refactor — Envelope → Split Files

Pre-launch clean-break refactor. One-off migration for existing personal-site data, no runtime compat branches.

## Goal

Split today's single-object `{json, html}` envelope into two sibling objects on storage:

- `{key}.html` — pre-rendered HTML, public, long-lived CDN cache, `mimeType = "text/html"` on the DB row
- `{key}.json` — Tiptap AST (the real source of truth), private-ish, long-lived cache

Give text attachments a proper public URL like images, simplify static export, drop the envelope wrapper entirely.

## Design decisions (already agreed in chat)

1. **`storageKey` points to `.html`** (the public artifact users/browsers actually consume). JSON is derived by swapping suffix via one helper. **No new DB column.**
2. **Tiptap JSON is source of truth, HTML is compiled artifact.** Both stored; not redundant — different roles. Markdown does not appear in storage.
3. **API contract unchanged** — clients still POST markdown. Server normalizes: markdown → Tiptap JSON → HTML → write two files.
4. **Immutable in practice already.** Editing a post's text attachment today creates a new media row + new storageKey and deletes the old (`services/post.ts:2121-2143`). The refactor preserves this; cache invalidation is a non-issue because keys never get reused.
5. **Cache-Control** on both `.html` and `.json`: `public, max-age=31536000, immutable`. (Current write path omits this — bug fixed en passant.)
6. **Write order:** JSON first, HTML second. **Delete order:** HTML first (makes attachment unreachable immediately), then JSON. Failed HTML upload rolls back JSON.

## Out of scope

- Client-side lightbox / iframe viewer UI — deferred to a later task. Export-side output is just a `<a href>` link for now.
- Any changes to the markdown-in / markdown-out API contract.
- Any user-facing UX change for composing / editing attachments.

---

## Tasks

### 1. Introduce the key-convention helper

**File:** `packages/core/src/services/media.ts` (or `src/lib/storage-keys.ts` if we want it outside the service module — decide at implementation time based on who needs to import it; at minimum the migration script needs it)

Add:

```ts
export function textAttachmentJsonKey(htmlKey: string): string {
  return htmlKey.replace(/\.html$/, ".json");
}
```

Exported so the migration script can import it too. All code that needs the JSON key goes through this helper — no ad-hoc `.replace()` calls elsewhere.

### 2. Storage layer — write path

**File:** `packages/core/src/services/media.ts`

- Change `ATTACHED_TEXT_FILENAME` from `"attached-text.md"` to `"attached-text.html"` so `generateStorageKey` produces `.html`-suffixed keys naturally (extension comes from the filename tail in `lib/upload.ts:517`).
- Replace `ATTACHED_TEXT_MIME_TYPE = "text/x-tiptap+json"` constant. Introduce:
  - `TEXT_ATTACHMENT_HTML_MIME_TYPE = "text/html; charset=utf-8"` (what the DB row stores)
  - `TEXT_ATTACHMENT_JSON_MIME_TYPE = "application/json"` (storage object only, not in DB)
- Rewrite `createTextAttachment`:
  1. Convert markdown → Tiptap JSON → HTML (existing `markdownToTiptapJson` + `renderTiptapJson`).
  2. Generate `htmlKey` via `generateStorageKey(siteId, "attached-text.html")`.
  3. Derive `jsonKey = textAttachmentJsonKey(htmlKey)`.
  4. Upload JSON object first with `application/json` + immutable cache.
  5. Upload HTML object second with `text/html; charset=utf-8` + immutable cache.
  6. On HTML upload failure: best-effort delete the JSON, rethrow.
  7. Validate size against `maxFileSizeMB` using the HTML bytes (the public-facing artifact is the one users "see"; JSON piggybacks).
  8. Persist media row: `storageKey = htmlKey`, `filename` derived by `generateStorageKey`, `originalName = "attached-text.html"`, `mimeType = "text/html"`, `mediaKind = "text"`, `size = htmlBytes.byteLength`.

### 3. Storage layer — read paths

**File:** `packages/core/src/services/media.ts`

- `getTextAttachmentHtml(id, storage)`:
  - Detection: check `mediaKind === "text"` (not MIME — that's now `"text/html"` and collides with nothing, but `mediaKind` is the correct semantic gate).
  - Read `record.storageKey` directly (it's the `.html` file). Return as string.
  - Return `{ id, html, summary, chars }`. No envelope parsing.
- `getTextAttachmentContent(id, storage)` (returns markdown for the API):
  - Detection: `mediaKind === "text"`.
  - Read `textAttachmentJsonKey(record.storageKey)` to get Tiptap JSON.
  - Convert JSON → markdown via existing `tiptapJsonToMarkdown`. Return `{ id, type: "text", contentFormat: "markdown", content, summary, chars }` unchanged for callers.

### 4. Delete path — remove both siblings

**File:** `packages/core/src/services/media.ts`, functions `delete()` (~line 627) and `deleteByIds()` (~line 650)

When the record is a text attachment (`mediaKind === "text"`), delete both `storageKey` (HTML) **and** `textAttachmentJsonKey(storageKey)` (JSON). Order: HTML first, then JSON. Every delete remains best-effort (errors logged, not thrown) — consistent with the existing pattern.

### 5. Public URL for text attachments (remove the special case)

**File:** `packages/core/src/lib/api-posts.ts` lines 32-44

Currently `toApiAttachment` branches on `ATTACHED_TEXT_MIME_TYPE` and returns a `type: "text"` payload without the media URL. After the change, text attachments have a legitimate public URL (the `.html` file).

Decide on the final shape:

**Option A (clean break)** — text collapses into the unified `type: "media"` shape with `url` populated. Consumers of the `contentUrl`/`contentFormat` fields migrate. Matches the "everything is just a media with a URL" model.

**Option B (keep text-specific shape)** — still return `type: "text"` for clients that need to render differently, but add `url` pointing to the `.html` file. Keep `contentUrl` for programmatic markdown access.

**Recommendation: Option B.** Type discrimination is useful for the renderer ("this attachment is a doc, not an image"). The URL is new info that enables new flows without breaking old ones. Cost: a couple of extra fields.

Either way: remove the `ATTACHED_TEXT_MIME_TYPE` constant from `api-posts.ts:5` (detect via `mediaKind === "text"` instead — requires making sure `media.mediaKind` is exposed to this function).

### 6. Static export — drop inlining, link to public URL

**File:** `packages/core/src/services/export.ts`

- Delete `buildTextAttachmentContentMap` (~line 898) and the call at line 227. No more eager content fetch.
- Remove `textAttachmentContent` parameter from `buildAttachmentMeta` (line 841). Text attachments go through the same branch as other media now — just need `src` from `getMediaUrl(storageKey, ...)`.
- Rewrite the text-attachment figure (line 768-782):

  ```html
  <figure data-jant-node="attachment" data-jant-kind="text">
    <script type="application/json" data-jant-meta>
      {metaJson}
    </script>
    <a href="{src}" target="_blank" rel="noopener noreferrer">{name}</a>
    <figcaption>...</figcaption>
  </figure>
  ```

  `{name}` = `summary` if present, else `originalName`, else a hardcoded i18n'd fallback.

- Remove `renderMarkdown()` usage for text attachments in `export.ts`. Check if `renderMarkdown` import becomes unused; remove if so.
- `AttachmentExportMeta` type update: text no longer needs `content` / `contentFormat` fields; now has `src` + `mimeType = "text/html"` like other media.

### 7. SSR path — simplify

**File:** `packages/core/src/routes/pages/page.tsx` (wherever `getTextAttachmentHtml` is called)

Once `getTextAttachmentHtml` is rewritten in task 3, the consumer should be unchanged (same return shape). Verify with a read-through that nothing else in the SSR page depends on the old MIME type or envelope structure.

### 8. API route sanity

**File:** `packages/core/src/routes/api/attachments.ts`

`GET /:id/content` still exists and returns markdown — just goes through the rewritten `getTextAttachmentContent`. No route changes expected. Verify with existing tests.

### 9. DB schema

**No changes.** `storageKey`, `mimeType`, `mediaKind`, `originalName`, `size` all exist on the `media` table. Just the values written for text attachments change. Both SQLite (`src/db/schema.ts`) and Postgres (`src/db/pg/schema.ts`) schemas remain valid.

### 10. One-off migration script

**File:** `packages/core/bin/commands/migrate-text-attachments.js`

Follow the existing command style in `packages/core/bin/commands/` (look at `migrate.js` and `media.js` for the idiomatic CLI shape).

Flow (per site):

1. Query all `media` rows where `mediaKind = 'text'` AND `mimeType = 'text/x-tiptap+json'` (unmigrated).
2. For each row:
   a. Read old envelope object at `record.storageKey`.
   b. Parse `{ json, html }` out of envelope.
   c. Compute new keys:
   - `baseKey = record.storageKey.replace(/\.md$/, "")` (old filename was `attached-text.md`, so old keys end in `.md`)
   - `htmlKey = ${baseKey}.html`
   - `jsonKey = ${baseKey}.json`
     d. Put `jsonKey` → `JSON.stringify(envelope.json)` with `application/json` + immutable cache.
     e. Put `htmlKey` → `envelope.html` bytes with `text/html; charset=utf-8` + immutable cache.
     f. Update DB row: `storageKey = htmlKey`, `mimeType = "text/html"`, `originalName = "attached-text.html"`, `size = htmlBytes.byteLength`, `filename` adjusted to match new key's tail.
     g. Delete old envelope object (only if its key differs from both new keys, which it will because extension changed from `.md`).

Flags:

- `--dry-run` — print the plan, no writes/deletes.
- `--site <id>` — scope to one site. Default: iterate all sites.
- `--limit <n>` — process at most N records (useful for spot-testing).

Idempotency:

- Skip any record with `mimeType = 'text/html'` and `mediaKind = 'text'` (already migrated).
- Re-running after a partial failure is safe: `put` is idempotent (overwrites), DB update is idempotent (same fields), old-object delete is best-effort.

Output:

- Per-record: `[migrating] med_xxx: <oldKey> → <htmlKey> + <jsonKey>`
- Summary at end: migrated N, skipped M, failed K.

### 11. Remove legacy constants and dead code

After migration works:

- Delete `ATTACHED_TEXT_MIME_TYPE` constant from `api-posts.ts:5` (replaced by `mediaKind === "text"` checks).
- Verify no other file still imports or references `"text/x-tiptap+json"` except the migration script's detection query. Grep and clean up.
- Remove any now-unused imports in `export.ts` (likely `renderMarkdown`, `TextAttachmentContent`, `buildTextAttachmentContentMap`).
- `TextAttachmentContent` type (`src/types/operations.ts`) stays — still returned by `getTextAttachmentContent` API. Its `contentFormat` field is preserved for future "accept other formats" flexibility.

### 12. Tests

**Files to update:**

- `packages/core/src/services/__tests__/media.test.ts`:
  - `createTextAttachment` writes two objects (`.html` and `.json`), correct MIME types, correct `Cache-Control`, correct DB row state.
  - `getTextAttachmentHtml` reads the `.html` object directly (no envelope).
  - `getTextAttachmentContent` reads the `.json` sibling and converts to markdown.
  - `delete` / `deleteByIds` remove both siblings.
  - Rollback: if HTML put fails, JSON is cleaned up.
- `packages/core/src/routes/api/__tests__/attachments.test.ts`:
  - `GET /:id/content` still returns markdown. No regression.
- `packages/core/src/__tests__/export-service.test.ts`:
  - Text attachment in export output has `<a href="…/…html">`, not `<details>` + inline HTML. Snapshots updated.
  - Export no longer calls storage for text-attachment content at build time (assert no calls to `getTextAttachmentContent` in export flow).
- New test for the migration script: given a seeded set of old-format records + storage objects, running the script produces correct new objects and DB state; running it again is a no-op.

### 13. Documentation

- `docs/internal/markdown-contract.md` — if it documents storage format, update to reflect split files.
- Commit message explicitly calls out the breaking storage change and points to the migration command.

---

## Verification plan

1. `mise run check-tests` — all passes.
2. `mise run check-lint` — clean.
3. Manual in `mise run dev-debug`:
   - Create a new post with a text attachment. Confirm two objects land in local storage (`.html` + `.json`), correct MIME types, correct headers.
   - Open the `.html` URL directly in a browser tab — content renders standalone.
   - Edit the post (changing attachment content). Confirm new keypair created, old pair deleted.
   - Run `jant export` and inspect output — text attachment figure is a `<a href>` link to the CDN URL, no inline HTML.
4. Run migration with `--dry-run` against personal site data; inspect planned operations.
5. Run migration for real; spot-check a few posts in the UI that their text attachments still render.

## Execution / commit plan

Three logical commits:

- **Commit 1:** Tasks 1-4 (helper + write/read/delete in service layer). Self-contained; all tests updated.
- **Commit 2:** Tasks 5-8 (public URL, export, SSR, API) + task 11 (legacy cleanup) + task 12 test updates touching export/API. Now the runtime treats text attachments as standard media everywhere.
- **Commit 3:** Task 10 (migration script) + its tests + documentation (task 13).

User runs the migration locally against personal production data between commit 2 and commit 3 being deployed (or after, since the migration only operates on legacy records).

## Review

_Filled in after execution._
