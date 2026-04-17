# Zola Theme Packaging + Feed Taxonomy Refactor

Move Jant's site export from a flat root layout to a proper Zola theme at
`themes/jant/`, and replace ad-hoc `latest_hidden` filtering with a native
Zola `feed` taxonomy. Simplify GitHub sync to a fixed set of Jant-managed
paths; everything else is user territory and preserved.

## Context & Why

The current export writes templates and static assets directly under the
site root, which collides with any user customization. Worse, post
visibility (`public`, `latest_hidden`) is encoded as a template-time filter
over a single "everything" section — so Zola's paginator counts posts that
the template hides, producing empty page-1 bugs and awkward archive
pagination.

Two orthogonal fixes:

1. **Feed taxonomy.** Add `taxonomies.feed = ["public"|"unlisted", "archive"]`
   on every post. `config.toml` declares `[[taxonomies]] name = "feed"` with
   pagination. Home renders `feed=public` page 1 manually (with pinned
   prepended) and hands page 2+ to Zola's native paginator at
   `/feed/public/page/N/`. Archive renders `feed=archive` page 1 and uses
   `/feed/archive/page/N/`. All `latest_hidden` filters disappear.

2. **Theme packaging.** All Jant templates and static assets move to
   `themes/jant/`. `config.toml` sets `theme = "jant"`. Root `templates/`
   and root `static/` become user territory — Zola's native override
   mechanism picks root files over theme files automatically.

## Jant-managed paths (hard list)

Jant fully owns and always overwrites:

```
content/**
themes/jant/**
config.toml
.gitignore
README.md
.jant-sync
```

Everything else is user territory; Jant never touches it. No tiers, no
"init-only" exceptions.

## URL scheme

| URL                           | Source                                                           |
| ----------------------------- | ---------------------------------------------------------------- |
| `/`                           | home.html (manual render: feed=public page 1 + pinned prepended) |
| `/feed/public/page/N/`        | Zola native paginator on feed taxonomy                           |
| `/archive/`                   | archive.html (manual render: feed=archive page 1)                |
| `/feed/archive/page/N/`       | Zola native paginator on feed taxonomy                           |
| `/{slug}/`                    | Post                                                             |
| `/{slug}/` (collection slug)  | collection taxonomy term page                                    |
| `/collections/{slug}/page/N/` | collection paginator                                             |
| `/feed/unlisted/`             | taxonomy_single with `<meta robots=noindex>`                     |

## Files changed (overview)

- `packages/core/src/services/export.ts` — taxonomy emission, path
  re-layout, `theme.toml`, `.jant-sync`, template rewrites, `JANT_MANAGED_GLOBS`.
- `packages/core/src/services/github-sync.ts` — simplify `pushFullSync`,
  drop seed-probe logic, bump marker schema to v2.
- `packages/core/bin/commands/import-site.js` — update `custom.css` and
  favicon read paths; no new behavior.
- `packages/core/src/__tests__/export-service.test.ts` — path updates,
  new assertions for taxonomy + theme.
- `packages/core/src/services/__tests__/github-sync-classify.test.ts` —
  marker schema v2.
- `sites/demo-source/canonical/site-export/` — full regeneration.
- `docs/internal/theme-export.md` — new; `docs/export-and-import.md` —
  update URLs/customization.

## Commit boundaries (6 commits)

1. `feat(export): thread archivePageSize into SiteConfig callers` (plumbing)
2. `feat(export): emit feed taxonomy on posts + config.toml` (no template changes)
3. `feat(export): rewrite home/archive/taxonomy templates for feed model`
4. `refactor(export): relocate templates+static into themes/jant theme`
5. `feat(export,sync): managed paths model + .jant-sync v2`
6. `docs(export): theme model + feed taxonomy + customization`

Regenerate `sites/demo-source/canonical/site-export/` fixture at the end
of commit 4 (or commit 5 — whichever settles the layout).

## Open decisions (resolved — see session)

- `paginate_by` for `feed` taxonomy: single value = `pageSize` for both
  home and archive pagination.
- `content/**` deletion semantics: preserve stale files via base_tree; do
  not enumerate-and-null in this PR.
- `feed = true` on `feed` taxonomy: yes; `/feed/unlisted/atom.xml` exists
  but is noindex'd.
- `POST_DIR` pre-existing bug in webhook pull: out of scope; track in
  separate task.
- `.jant-sync` authorship: `github-sync.ts` writes marker (knows siteId);
  export service does NOT emit `.jant-sync` — `JANT_MANAGED_GLOBS` covers
  it as a marker-owned path.
- `/feed/unlisted/` indexing: `<meta robots=noindex>`; live with sitemap
  entry.

## Pre-flight checks before starting

- Verify on Zola 0.19+ that root `templates/<name>.html` shadows
  `themes/jant/templates/<name>.html`. This is the load-bearing assumption
  for the whole theme model. Test with a minimal fixture.
- Verify `get_taxonomy_term(kind, term)` works with `feed` taxonomy and
  returns pages in the same sort order Zola's paginator uses (so page 1
  manual slice matches page 2+ native paginator boundary exactly).

## Risks

- Home page 1 manual rendering must match Zola paginator page 2 exactly
  (no dup/skip at boundary). Mitigated by writing a regression test that
  exports 2×pageSize + 1 pinned, builds with Zola, asserts no duplicate
  slugs across pages.
- `TEMPLATE_ATOM` is rendered per taxonomy term feed; `/feed/unlisted/atom.xml`
  will exist. Acceptable (noindex the term page; atom has no SEO impact).
- Marker schema v2 means connected repos re-init on first post-deploy
  push. Pre-1.0, acceptable; note in commit message.

## Test plan

- Unit: `buildPostMarkdown` emits `taxonomies.feed` correctly for each
  visibility; `buildConfigToml` emits `[[taxonomies]] name = "feed"`;
  templates don't contain `latest_hidden`.
- Unit: export output has `themes/jant/theme.toml`, `config.toml` has
  `theme = "jant"`, favicons live under `themes/jant/static/`.
- Unit: `pushFullSync` preserves a base_tree file outside `JANT_MANAGED_GLOBS`.
- Integration (manual): run `zola build` on generated export with >
  pageSize public posts, 1 latest_hidden, 1 pinned. Verify `/`,
  `/feed/public/page/2/`, `/archive/`, `/feed/archive/page/2/`, pinned
  post is top of `/`, unlisted post reachable via direct URL but absent
  from `/` and `/archive/` paginated pages.
