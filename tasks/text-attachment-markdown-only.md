# Text Attachment: Markdown-Only Storage

Follow-up to `tasks/text-attachment-storage-refactor.md`. The previous refactor
split the envelope into `.html` + `.json` siblings. This one collapses to a
single `.md` file per text attachment — the canonical source of truth, nothing
else on disk.

## Why

Markdown is the API contract (users send markdown to `createTextAttachment`),
the conceptual source ("the user wrote markdown"), and the import format.
Storing anything else is persisting a derived artifact. Consolidating to
markdown:

- One object per attachment, not two
- Zero rendering at write time — just store the bytes
- Copy markdown is trivial (serve the file)
- Edit support is natively lossless (Tiptap's markdown extension is designed
  for this exact round-trip — `parseMarkdownDocument` ↔ `tiptapJsonToMarkdown`)
- Import → fetch `.md` → re-upload — minimal transcoding
- Schema evolution — re-render HTML on read whenever Tiptap/theme changes

## Design decisions

1. **`.md` is the only persisted form.** No `.html`, no `.json` sibling. DB
   row's `storageKey` points to the `.md` file. `mimeType` on the row is
   `text/markdown; charset=utf-8`.
2. **HTML is computed at read time.** Server renders via
   `renderTiptapJson(JSON.stringify(parseMarkdownDocument(md)))` when an HTML
   view is needed (SSR preview route, `/api/media/:id/content` response).
   Negligible cost at this scale; responses get `Cache-Control: immutable`
   so CDN serves cached HTML for repeat views.
3. **Direct CDN access shows raw markdown.** Clicking a text-attachment link
   in the exported Zola site hits the R2 public URL and shows the `.md`
   bytes as `text/markdown; charset=utf-8` + `Content-Disposition: inline`.
   Browser displays plain text. **This is intentional and acceptable** —
   the main site renders HTML; raw markdown at the CDN URL is the degraded
   case for export-site clickthrough, and equivalent to "viewing the source"
   for the other cases (share URL, curl). No worker rewrite, no special
   routing.
4. **Editing published text attachments is back.** Previously removed
   because HTML→Tiptap is slightly lossy. With markdown, the round-trip
   lives inside the Tiptap markdown extension (both ways): no fidelity
   risk. The client re-hydrates the editor from the `.md` source.
5. **Immutable storage keys.** "Edit" stays implemented as "create new
   storageKey + delete old" in the post service; we're not changing that.
   Every published `.md` at a given key is a fixed immutable content.

## Current state (what this supersedes)

We just landed commits `52d953d8`, `5a667dde`, `d3a5d15f`, `2b8bf6fe`,
`cb82330d` doing the `.html` + `.json` split. This plan undoes the split
(no sibling) and drops the `.html` file. The split migration script shipped
recently will need to be updated to also handle the `.html`/`.json` →
`.md` transition for sites that already ran the first migration.

Two legacy formats to migrate from:

- `mimeType === "text/x-tiptap+json"` → envelope (single JSON object with
  `json` and `html` fields)
- `mimeType === "text/html; charset=utf-8"` → split (`.html` primary with
  `.json` sibling)

Both migrate to: `mimeType === "text/markdown; charset=utf-8"`, single `.md`
file at a new storage key.

## Out of scope

- Adding new text-attachment features (tags, versioning, etc.) — just
  storage format.
- Changing the compose API input format — still markdown in.
- Touching image / video / audio attachment logic — unchanged.

---

## Tasks

### 1. Storage layer

**`packages/core/src/services/media.ts`**

- Replace constants:
  - `TEXT_ATTACHMENT_MARKDOWN_MIME_TYPE = "text/markdown; charset=utf-8"`
  - Keep `TEXT_ATTACHMENT_CACHE_CONTROL` as-is (immutable)
  - Add `TEXT_ATTACHMENT_CONTENT_DISPOSITION = "inline"` (so Safari never
    prompts to download a `.md` clickthrough)
  - `TEXT_ATTACHMENT_FILENAME = "attached-text.md"`
  - Delete `TEXT_ATTACHMENT_HTML_MIME_TYPE`, `TEXT_ATTACHMENT_JSON_MIME_TYPE`
- Delete `textAttachmentJsonKey` helper and its export.
- Update `isTextAttachment`: check `mimeType === TEXT_ATTACHMENT_MARKDOWN_MIME_TYPE`.
- Rewrite `createTextAttachment`:
  - Validate markdown input (existing).
  - Derive summary + chars from markdown (maybe via Tiptap parse for
    consistency, or straight text extraction — use existing helper path).
  - Encode markdown as UTF-8 bytes.
  - Single `storage.put` with markdown mime + inline disposition + immutable
    cache.
  - Create DB row with `storageKey = mdKey`, `mimeType = text/markdown; charset=utf-8`,
    `mediaKind = "text"`, `size = mdBytes.byteLength`, `originalName = "attached-text.md"`.
- Rewrite `getTextAttachmentContent`:
  - Read `record.storageKey` directly (the `.md` file).
  - Return `{ id, type: "text", contentFormat: "markdown", content: mdText, summary, chars }`.
  - No JSON sibling read, no AST parsing.
- Rewrite `getTextAttachmentHtml`:
  - Read `.md`.
  - Render: `parseMarkdownDocument(md)` → Tiptap AST → `renderTiptapJson(JSON.stringify(ast))`.
  - Return `{ id, html, summary, chars }`.
  - Note: this is the first server-side usage of `parseMarkdownDocument`
    (until now it was client-only). Verify it runs on both Node and CF
    Workers. It relies on Tiptap markdown extension which depends on
    `markdown-it`; should be edge-safe.
- Simplify `delete` / `deleteByIds`:
  - Text attachments only have the primary `storageKey` now.
  - Drop the `textAttachmentJsonKey` sibling delete branches entirely.

### 2. Migration service method

Same signature as before, `migrateEnvelopeTextAttachments` → rename to
`migrateLegacyTextAttachments` (or keep the name, document that it now
handles both formats). Flow:

```
For each row where mediaKind === "text" AND mimeType !== "text/markdown; charset=utf-8":
  case "text/x-tiptap+json":
    # envelope format
    read envelope from storageKey
    extract envelope.json (Tiptap AST)
    markdown = tiptapJsonToMarkdown(JSON.stringify(envelope.json))
    write new .md key with markdown bytes
    update DB row (storageKey, mimeType, size, originalName, filename, updatedAt)
    delete old envelope object

  case "text/html; charset=utf-8":
    # split format
    jsonKey = storageKey.replace(/\.html$/, ".json")  # local helper (no more exported helper)
    read json sibling
    markdown = tiptapJsonToMarkdown(jsonText)
    write new .md key
    update DB row
    delete old .html object (at storageKey)
    delete old .json sibling
```

Both paths converge on writing a single `.md`. Idempotent, batch-limited.

### 3. `/api/media/:id/content` endpoint

**`packages/core/src/app.tsx`**

- Drop `textAttachmentJsonKey` import.
- For text attachments (`isTextAttachment(media)`):
  - Read `.md` (single storage.get).
  - Compute html via `renderTiptapJson(JSON.stringify(parseMarkdownDocument(mdText)))`.
  - Return `{ html, markdown: mdText }`.
- Non-text: unchanged bytes proxy.

### 4. Client compose edit re-hydration

**`packages/core/src/client/components/jant-compose-dialog.ts`**
`resolveApiAttachments`:

- Already calls `/api/attachments/:id/content` which returns
  `{ id, type, contentFormat: "markdown", content: md, summary, chars }`.
- Already converts md → Tiptap via `parseMarkdownDocument` in the client.
- **No change needed** (the previous commit already did this right).

Verify, add a test, move on.

### 5. SSR preview page

**`packages/core/src/routes/pages/page.tsx`**

- `getTextAttachmentHtml` now renders internally — the caller stays the same.
- Sanity-check: confirm the inlined `dangerouslySetInnerHTML` content is
  still well-formed after the in-pipeline render.

### 6. Export & Import

**Export:** The `<a href>` already points to `getMediaUrl(storageKey, …)`,
which after the switch will be the `.md` URL. Zero changes needed in
`services/export.ts`. The data-jant-meta stays `{kind:"text", src:…, mimeType,
summary, chars}` — which is enough for importer.

**Import:** Handle `kind: "text"` in `bin/commands/import-site.js`:

- Fetch the `src` via `readImportAsset` (same mechanism as images).
- Decode bytes as UTF-8 markdown.
- Pass to `createTextAttachment` (the attachment input for this post).

The importer currently skips text attachments lacking `contentFormat` +
`content` fields. Update `normalizeTextAttachmentSpec` to also accept
"kind = text + src URL" and fetch the content at import time.

### 7. Tests

- `packages/core/src/services/__tests__/media.test.ts`:
  - `createTextAttachment` writes ONE `.md` file with correct mime +
    cache + disposition. No sibling.
  - `getTextAttachmentContent` returns markdown read from storage.
  - `getTextAttachmentHtml` renders correct HTML from markdown.
  - `delete` / `deleteByIds` remove only the single `.md`.
  - Migration: envelope → `.md`, split → `.md`, idempotent, batched.
- `packages/core/src/routes/__tests__/compose.test.ts` and
  `packages/core/src/routes/api/__tests__/posts.test.ts`: update
  `storage.files.size` expectations to `1` (was `2`).
- `packages/core/src/__tests__/export-service.test.ts`: update figure's
  `src` expectation to end with `.md`; update `mimeType` in meta to
  `text/markdown; charset=utf-8`.
- `packages/core/src/client/components/__tests__/jant-text-preview.test.ts`:
  confirms the dialog still works with `{html, markdown}` response.
- Jant-compose-dialog tests if any cover resolveApiAttachments.
- **New:** import round-trip test (integration-style): export → import →
  attachment content matches.

### 8. Cleanup of obsolete code

After tasks 1-7 pass:

- Delete `textAttachmentJsonKey` everywhere (already listed, flagged for
  explicit confirmation).
- Delete `TEXT_ATTACHMENT_HTML_MIME_TYPE`, `TEXT_ATTACHMENT_JSON_MIME_TYPE`
  constants.
- Migration script: rename or clearly document that it covers both legacy
  formats. Can be deleted entirely after user's sites are migrated; for
  now keep it as a safety net.

---

## Verification plan

1. `mise run check-types` — clean.
2. `mise run check-tests` — all pass.
3. `mise run check-lint` — clean.
4. Manual `mise run dev-node`:
   - Create new text attachment in compose. Confirm a single `.md` file
     lands in storage.
   - View preview dialog. HTML renders correctly. Copy markdown works.
   - Edit existing (published) attachment. Editor re-hydrates correctly.
   - Save edit. Confirm old `.md` deleted, new `.md` created.
   - Run migration on pre-existing test data (has both envelope and split
     formats from earlier testing). Confirm all resolve to `.md`.
   - `jant export` a site. Open a post with a text attachment. Click the
     attachment link. See raw markdown (acceptable degradation).
   - (Optional) Test import path: export a site, import it into a fresh
     local. Confirm text attachments recreated with identical content.

## Commit plan

Three commits:

- **Commit 1**: Core storage switch (tasks 1, 3, 4, 5) + test updates. Single
  atomic change because detection-switching partial state is non-viable
  (same pattern as the previous refactor).
- **Commit 2**: Migration script + tests. After commit 1, this is what
  brings existing data forward.
- **Commit 3**: Import round-trip (task 6 import half + tests). Separate
  because import changes `bin/` code and the importer flow, distinct
  concern from the core refactor.

## Review

_Filled in after execution._
