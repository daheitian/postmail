# Sitemap Improvements

## Background

Current `sitemap.xml` generation (`packages/core/src/routes/feed/sitemap.ts`) has several gaps:

1. **Reply posts are excluded from sitemap**, which is correct defensively — but the underlying problem is that reply URLs render the full thread without a `<link rel="canonical">`, so search engines see them as duplicate content regardless. The exclusion masks the real bug.
2. **Collections are entirely missing** from sitemap — single-collection pages, `/collections` directory, and aggregates.
3. **1000-post hard limit** with no pagination — silently drops content on long-running sites.
4. **Heavy query path**: uses `posts.list()` + `toPostViewsFromPosts` which loads fields and relations sitemap doesn't need.
5. No sharding means one file grows unbounded and can't be cached incrementally.

## Goals

- Emit `<link rel="canonical">` on every post page so reply URLs do not confuse crawlers.
- Shard sitemap by TypeID (`id` ASC, keyset-paginated) so old shards are immutable and cacheable long-term.
- Add a lean `listForSitemap` query that only selects the fields sitemap needs.
- Include public collection pages in the sitemap.
- Keep the existing defaults (exclude private, exclude replies, exclude deleted) — the semantics are correct; only the implementation changes.

## Non-goals

- Changing `latest_hidden` behavior (current inclusion is correct — those pages are public and should be indexable).
- Changing `robots.txt`.
- Adding `changefreq`/`priority` tuning beyond what already exists.
- Creating archive/tag/format aggregation pages in sitemap (out of scope; those aren't first-class public pages today).

## Plan

### Step 1 — Canonical link on post pages

**Why first**: this is a correctness fix that stands on its own. Once reply URLs have a canonical pointing to the thread root, the sitemap exclusion becomes a performance choice rather than a duplicate-content workaround.

**Files**:

- `packages/core/src/ui/layouts/BaseLayout.tsx` — accept optional `canonicalHref` prop and render `<link rel="canonical" href={...}>` in `<head>` when present.
- `packages/core/src/lib/render.tsx` — add `canonicalHref?: string` to `RenderPublicPageOptions` and forward to `BaseLayout`.
- `packages/core/src/routes/pages/page.tsx` — when rendering a post, compute the canonical URL:
  - If the post is a reply (`post.replyToId != null`), the canonical URL is the thread root's permalink.
  - Otherwise canonical is the post's own permalink.
  - Use the root post's primary alias (via `paths.getPostAliases`) to build the URL, just like sitemap does.
- Also consider `routes/pages/collection.tsx` and other public pages — leave them alone for now; only post pages have the duplicate-content problem.

**Test**: `packages/core/src/routes/pages/__tests__/` — add a test that a reply URL renders `<link rel="canonical">` pointing to the root's permalink, and a non-reply renders its own permalink.

### Step 2 — `listForSitemap` service method

**Why**: sitemap only needs `id`, `slug`, `updatedAt`, `featuredAt` + primary alias. The current pipeline loads full Post rows, media, collections — wasteful at 500×N.

**Files**:

- `packages/core/src/services/post.ts`:
  - Add method `listForSitemap(options: { afterId?: string; limit: number }): Promise<Array<{ id, slug, updatedAt, featuredAt }>>`.
  - Query: `SELECT id, slug, updatedAt, featuredAt FROM post WHERE status='published' AND deletedAt IS NULL AND effectiveVisibility != 'private' AND replyToId IS NULL AND (afterId IS NULL OR id > afterId) ORDER BY id ASC LIMIT ?`.
  - Use the existing `effectiveVisibilityExpr` subquery (already in this file around L491).
  - Also add `collections.listForSitemap()` returning `{ id, slug, updatedAt }[]` for public collections.
- Tests in `services/__tests__/post.test.ts` and `services/__tests__/collection.test.ts`:
  - Returns only public non-reply published posts.
  - Respects the `afterId` keyset cursor.
  - Returns them in ascending `id` order.

### Step 3 — Sharded sitemap with index

**Files**:

- `packages/core/src/routes/feed/sitemap.ts`:
  - `GET /sitemap.xml` → sitemap **index** that lists all shards.
    - Post shards: compute count via a cheap `COUNT(*)` and emit `/sitemap-posts-1.xml` … `/sitemap-posts-N.xml`.
    - Collection shard: `/sitemap-collections.xml` (unless empty).
    - Pages shard: `/sitemap-pages.xml` (homepage + `/archive` + `/collections` index).
  - `GET /sitemap-posts-:page(\\d+).xml`:
    - Parse page number, compute cursor by scanning prior pages OR store a shard cursor table (see "Cursor strategy" below).
    - Call `posts.listForSitemap({ afterId, limit: 500 })`.
    - Emit urlset with `<loc>`, `<lastmod>`, `<priority>`.
    - `Cache-Control`: long for full/old shards, short for the last (not-yet-full) shard.
  - `GET /sitemap-collections.xml`: lists all public collection URLs.
  - `GET /sitemap-pages.xml`: homepage (`priority=1.0`) + any static aggregate pages.
- Add `packages/core/src/lib/feed.ts`:
  - `defaultSitemapIndexRenderer({ sitemapUrls: Array<{ loc, lastmod? }> })` → `<sitemapindex>` XML.
  - Keep `defaultSitemapRenderer` unchanged (per-shard renderer).
- Shard size constant in `feed.ts`: `export const SITEMAP_SHARD_SIZE = 500;`.

**Cursor strategy** — how does `/sitemap-posts-3.xml` know its starting `id`?

Two options, prefer (b):

- (a) Scan from the beginning: run `listForSitemap` (page-1) _N_ times with `LIMIT = SHARD_SIZE * (page-1)`, then emit the next batch. Simple but wasteful for high pages.
- (b) **Compute page → start cursor once per request** with a single query:
  ```sql
  SELECT id FROM post
  WHERE <same filters>
  ORDER BY id ASC
  LIMIT 1 OFFSET (page - 1) * SHARD_SIZE
  ```
  Then use `id > ?` to fetch the shard contents. OFFSET walk here scans only an index (no row fetch) — fast enough for sitemap traffic volume.
- A third alternative — storing cursors in a DB table — adds moving parts we don't need yet.

Go with (b). Revisit if we ever see real load.

**Lastmod for index entries** — use `max(updatedAt)` within the shard for per-shard `<lastmod>`. For post shards this requires a second `MAX(updatedAt)` query per shard in the index endpoint. Alternatively skip `<lastmod>` in the index (it's optional). Start by **skipping it** to keep the index endpoint cheap; revisit if Google complains.

**Caching**:

- Sitemap index: `Cache-Control: public, max-age=180` (matches today).
- Shards 1..N-1 (full shards): `Cache-Control: public, max-age=86400, s-maxage=86400`. Once a shard is full, its `id` membership is immutable; only post edits can change `<lastmod>` inside, which is acceptable staleness for sitemap.
- Shard N (the last one, not-yet-full): `Cache-Control: public, max-age=180`. Detect "last shard" by comparing returned row count < `SHARD_SIZE`.
- Collections/pages shards: `Cache-Control: public, max-age=180` (small, cheap, change rarely enough that this is fine).

**Tests** (`routes/feed/__tests__/sitemap.test.ts`):

- Sitemap index lists the correct number of shards given N posts.
- Shard N returns the expected posts in `id` ASC order.
- Shard beyond the last page returns 404.
- Collections shard lists public collections.
- Full shards return long cache headers; last shard returns short cache.
- Existing behavior preserved: private posts excluded, replies excluded, deleted excluded, `latest_hidden` included.

### Step 4 — Clean up the old code path

- Delete the now-dead `toPostViewsFromPosts`/`createMediaContext` usage from `sitemap.ts`.
- Remove the 1000-post hard limit.
- Verify nothing else imports the old sitemap helpers.

## Verification

- `mise run check-tests` — covers new service methods, new route handlers, canonical tag test.
- `mise run check-lint`.
- Manual: `mise run dev` and curl:
  - `/sitemap.xml` → sitemap index
  - `/sitemap-posts-1.xml` → first shard with real data
  - `/sitemap-collections.xml` → collections
  - `/robots.txt` → still points at `/sitemap.xml`
  - Visit a reply post page and inspect `<link rel="canonical">` in source.

## Open questions

- **Sharding collections**: if a site has hundreds of collections, do we need to shard `/sitemap-collections.xml`? Punt for now — realistic sites have < 50 collections. Add sharding later using the same pattern if it ever matters.
- **Including `/archive` paginated URLs in `/sitemap-pages.xml`**: skip. Archive is a navigation aid, not canonical content. Individual posts already cover everything archive exposes.

## Out of scope (future work)

- `<changefreq>` tuning per-post based on age.
- `<image:image>` extension for media attachments.
- Sitemap compression (`.xml.gz`) — premature.
- Ping search engines on publish (deprecated by Google in 2023 anyway).
