# GitHub Sync — Repo picker overhaul

Agreed in chat. Implementation order below.

## Current state (confirmed)

- `listInstallationRepos()` already paginates per_page=100 on the server. Callback route renders a plain `<select>` (`settings.tsx:1518`).
- `updateRef()` already uses `force: false` (`github-api.ts:287`). Non-empty repos get `base_tree` from HEAD so unmanaged files survive (`github-sync.ts:287`). **Force-push risk is already mitigated** — no change needed there.
- Empty repos are seeded with `.jant-init` placeholder today (`github-sync.ts:196`).
- `.jant/sync.json` does **not** exist yet. No ownership marker.
- No "create new repo" path. No owner/repo split. No search. No confirmation gate for foreign repos.
- `jant-post-menu.ts` collection picker is the reference searchable combobox pattern (lines 1106-1273).

## Phase 1 — Backend: ownership marker & classification

Foundational. Everything else depends on this being correct.

1. Add `.jant/sync.json` writer to `services/github-sync.ts` push flow. Schema:
   ```ts
   {
     site_id: string;
     site_host: string;
     created_at: number;
     schema_version: 1;
   }
   ```
   Written as a managed file on every push (idempotent content when unchanged so Git dedupes).
2. Add `classifyRepoForSync(client, owner, repo, siteId)` helper. Returns one of:
   - `"empty"` — no default branch / 404 on ref
   - `"owned"` — `.jant/sync.json` present and `site_id` matches
   - `"owned-by-other-site"` — marker present, different `site_id` (includes `site_host` for message)
   - `"foreign"` — non-empty, no marker
3. Unit tests for the classifier with mocked client.

## Phase 2 — Backend: new JSON API for the picker

New routes under `/github-sync/app/*` returning JSON (the picker is a Lit component, not a form submit):

1. `GET /github-sync/app/installations` — list installations accessible to the signed-in user. Returns `[{ installationId, account: { login, type, avatarUrl } }]`.
   - Requires extending `github-app.ts` with `listUserInstallations()` or similar — need to re-check which token scope allows this. If not feasible with App creds alone, fall back to passing installation info through from the install callback and only support the single installation that was just authorized.
2. `GET /github-sync/app/repos?installationId=X&q=foo&page=1` — first page of `listInstallationRepos`, plus:
   - When `q` given: call `/search/repositories?q=${q}+user:${owner}` with installation token, merge/dedupe.
   - Returns `{ repos: [...], hasMore: boolean, nextPage: number|null, total?: number }`.
3. `POST /github-sync/app/classify` — body `{ installationId, owner, repo }`. Returns classification from Phase 1.
4. `POST /github-sync/app/create-repo` — body `{ installationId, owner, repo, private: boolean }`. Calls `POST /user/repos` or `POST /orgs/{owner}/repos` depending on account type. Returns `{ fullName, defaultBranch }`.
5. `POST /github-sync/app/connect` — **extended** to require `confirmForeign: true` when classification is `foreign` or `owned-by-other-site`. Reject with 409 otherwise.

## Phase 3 — Frontend: searchable combobox Lit component

New `jant-repo-picker.ts` (light DOM, follows `jant-post-menu.ts` conventions):

1. Two comboboxes: owner + repo. Repo disabled until owner picked.
2. Owner dropdown: static list from `/installations` endpoint. Last item: "+ Install on another account" linking to `github.com/apps/{slug}/installations/new`.
3. Repo dropdown behavior:
   - On open: fetch page 1 (100 repos). Local filter while typing.
   - When input length ≥ 2 and user keeps typing past local match count: debounced 300ms fetch with `q=`.
   - Shows "Showing N of M" hint when paginated.
   - Last item: "+ Create `{owner}/{typed}`" when typed text is a valid repo name not in list.
4. Keyboard nav: ↑↓ Enter Esc. Match `jant-post-menu` idioms.
5. On select: POST to `/classify` → render inline status:
   - empty/owned → enable Connect button.
   - foreign/owned-by-other-site → show warning card + require typing `{owner}/{repo}` to confirm, then enable Connect.
6. Create-new modal inside picker: repo name input + public/private toggle → `/create-repo` → auto-select created repo.

## Phase 4 — Integrate into callback route

1. Replace `<form>` + `<select>` in `settings.tsx` callback route with `<jant-repo-picker>` element + hidden data attributes for installationId, App slug, CSRF token.
2. Move the Connect form submission into the Lit component (fetch POST to `/connect` with classification + confirmation).
3. Keep the no-repos-accessible fallback message.

## Phase 5 — i18n + copy

All new strings use `useLingui` + `msg({ message, comment: "@context: ..." })`. Follow UX Copy Guidelines:

- Destructive warning (foreign repo): "This repository already has content. `{owner}/{repo}` has {count} files. Connecting will push your site into its `main` branch on top of the existing history — existing files outside Jant's managed paths will be kept, but the connection will be permanent. Type `{owner}/{repo}` to confirm."
- Success: (silent — redirect to status page)

## Phase 6 — Verification

- `mise run check-tests` — new classifier tests + route tests.
- `mise run check-lint`.
- Manual smoke via `mise run dev-debug`: test empty repo, Jant-owned repo, foreign repo (with confirm), create new repo, search across pagination boundary.

---

## Check-in before executing

Phases 1 and 4 are cheap. Phase 2 has an unknown around `listUserInstallations` auth scope. Phase 3 is the bulk of the work (~400 LoC of Lit). Propose: execute 1 → 2 → 3 → 4 → 5 → 6, committing after 1, after 2+4 combined, and after 3. That's 3 commits, each independently reviewable.

## Review

_Filled in after execution._
