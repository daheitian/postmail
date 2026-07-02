# Investigate Quiet Reply Export Import

## Problem

`site export` / `site import` may not preserve the "Reply quietly" behavior.
A recent import appears to have turned quiet replies into normal replies that
bump the thread in Latest.

## Plan

- [x] Trace how `quietReply` affects post creation and timeline bump state.
- [x] Inspect `site export` output for any quiet-reply marker or equivalent
      metadata.
- [x] Inspect `site import` parsing and `createPost` calls for matching
      metadata handling.
- [x] Add or run focused verification that proves whether quiet replies
      round-trip correctly.
- [x] Document findings and, if needed, the fix in this task.

## Review

Done. `Reply quietly` is not stored as a per-reply export field. The persistent
state is the root post's `last_activity_at`, which records whether the thread
was bumped in Latest.

The bug was in `site import`: it ignored exported root `last_activity_at` and
created every imported reply as a normal reply. That made replies originally
published quietly bump the imported thread.

Fix:

- Added importer logic that compares each reply's `date` against the exported
  root `last_activity_at` (falling back to the root `date` when absent).
- Replies newer than that activity timestamp are imported with
  `quietReply: true`, so the API preserves the original thread activity state.
- Documented that quiet reply round-tripping is root-activity based, not a
  per-reply marker.

Verification:

- `mise run test -- src/__tests__/import-site-command.test.ts` passed from
  `packages/core` (typecheck, ESLint, core build, and 17 Vitest tests).

# Try Plain Markdown Headings

## Problem

Markdown `h2`/`h3` headings currently use italic styling, which feels awkward
in Chinese and too literary in mixed-language posts.

## Plan

- [x] Remove italic styling from public `h2`/`h3` prose headings.
- [x] Keep compose-editor and Hugo export headings consistent.
- [x] Run focused CSS verification and provide a local preview URL.

## Review

Done. Markdown `h2`/`h3` headings are now upright in:

- public `.prose` rendering,
- the compose TipTap editor,
- the Hugo export theme.

Blockquote and empty-state italics were left unchanged because they carry
different UI/content semantics.

Verification:

- `mise exec -- npx prettier --check packages/core/src/preset.css packages/core/src/services/export-theme/styles/main.css packages/core/src/styles/ui.css packages/core/src/ui/feed/__tests__/timeline-cards.test.ts tasks/todo.md`
  passed.
- `mise run test -- src/ui/feed/__tests__/timeline-cards.test.ts` passed from
  `packages/core` (including typecheck, ESLint, core build, and 25 tests).
- `mise run build` passed.
- `git diff --check` passed.
- Generated client CSS confirms public and compose `h2`/`h3` no longer include
  `font-style: italic`.

Preview:

- Existing local Jant dev server is available at `http://localhost:3000/`.

# Stop Repeated Remote Image Rehost Warnings

## Problem

Editing a saved post that still contains external images from an earlier paste
can repeatedly show the toast that those images could not be saved to the media
library. The old external image links should stay in the article without being
retried on every edit/save cycle.

## Plan

- [x] Trace the compose editor and TipTap rehost trigger path.
- [x] Restrict rehosting to actual paste transactions instead of every document
      change containing a remote image.
- [x] Add focused regression coverage for loading/editing a document that
      already has remote images.
- [x] Run proportionate verification and document the result.

## Review

Done. Rehost is now a paste-only side effect:

- `RehostImages` only scans for remote image candidates when a document-changing
  transaction is marked as a paste.
- Loading saved content with remote image URLs no longer attempts to sideload
  those URLs.
- A failed paste rehost can settle and clear its in-flight marker without later
  typing/editing retrying the same external URL.
- The toast regression test now dispatches a real paste event instead of
  simulating one with `setImage()`.

Verification:

- `mise run test -- src/client/tiptap/__tests__/rehost-images.test.ts src/client/tiptap/__tests__/paste-rehost-e2e.test.ts src/client/components/__tests__/jant-compose-editor-rehost-notice.test.ts`
  passed from `packages/core` (including typecheck, ESLint, core build, and 3
  Vitest files / 9 tests).
- `git diff --check -- packages/core/src/client/tiptap/rehost-images.ts packages/core/src/client/tiptap/__tests__/rehost-images.test.ts packages/core/src/client/components/__tests__/jant-compose-editor-rehost-notice.test.ts tasks/todo.md`
  passed.

# Normalize Markdown Code Styling

## Problem

Inline markdown `<code>` currently reads too heavy and boxy against normal prose.
Code blocks also share feed-card surface tokens, which makes technical snippets
feel more like cards than quiet reading content.

## Plan

- [x] Inspect current prose/code rules in the live app and export theme.
- [x] Replace inline and block code styling with quieter token-driven surfaces.
- [x] Verify the CSS and document the result.

## Review

Done. Markdown inline code and code blocks now use dedicated reading-surface
tokens instead of feed-card styling:

- Added `--site-code-*` tokens for text, inline background, block background,
  and block border.
- Updated live `.prose` styles so inline code is lighter, borderless, wraps
  cleanly, and resets typography plugin pseudo-content.
- Updated the Hugo export theme with matching inline and block code styling.
- Added a focused CSS regression check covering live and exported prose.

Verification:

- `mise exec -- npx prettier --check packages/core/src/styles/tokens.css packages/core/src/preset.css packages/core/src/services/export-theme/styles/main.css packages/core/src/ui/feed/__tests__/timeline-cards.test.ts tasks/todo.md`
  passed.
- `mise run test -- src/ui/feed/__tests__/timeline-cards.test.ts` passed from
  `packages/core`.
- `mise run build` passed.
- `git diff --check` passed.
- Generated client CSS contains the new inline code, code block, and pseudo
  reset rules. Browser screenshot verification was skipped because the in-app
  browser was unavailable and local Playwright is not installed.

# Integrate About Page in General Settings

## Problem

Jant already supports an About page as a normal post at `/about`, but users have
to know to create that hidden post themselves. Settings should make this standard
blog practice discoverable without adding a separate internal binding model.

## Plan

- [x] Inspect settings, compose, path, and navigation flows.
- [x] Resolve `/about` through services and expose its status to
      `Settings > General`.
- [x] Add an About page section with create/edit/view actions and clear conflict
      copy when `/about` is owned by something other than a post.
- [x] Reuse the compose dialog for About creation, prefilled as title `About`,
      slug `about`, and hidden-from-Latest visibility.
- [x] Add a navigation checkbox that appends or removes a normal `/about` link,
      while linking to full navigation settings for ordering.
- [x] Add focused coverage and run proportionate verification.

## Review

Done. Settings > General now treats `/about` as the standard About page:

- `AboutPageService` resolves `/about` through `path_registry`, reports missing,
  ready, or conflict states, and owns the normal `/about` navigation shortcut.
- The General settings page shows an About section with create/edit/view actions,
  conflict copy for collection/redirect/archive ownership, and a navigation
  checkbox with a link to full navigation settings for ordering.
- Compose `openNew()` now accepts initial title, slug, and visibility defaults,
  letting the About flow reuse the existing compose dialog with title `About`,
  slug `about`, and `latest_hidden` visibility.
- Lingui catalogs were extracted/compiled; new settings messages are translated
  in English, Simplified Chinese, and Traditional Chinese.
- Follow-up correction: fixed Chinese settings catalog format labels where
  translator guidance leaked into compact Link/Quote UI labels, and added
  regression coverage for those labels.

Verification:

- `mise run test -- src/services/__tests__/about-page.test.ts src/client/components/__tests__/jant-settings-general.test.ts src/ui/dash/settings/__tests__/GeneralContent.test.tsx`
  passed from `packages/core`.
- `mise run i18n-build` passed; settings catalog missing count is 0 for en,
  zh-Hans, and zh-Hant.
- `mise run test -- src/i18n/__tests__/fallback.test.ts src/client/components/__tests__/jant-settings-general.test.ts`
  passed after the Chinese label correction.
- `mise exec -- npx prettier --check ...` passed for all changed TS/TSX files.
- `mise run test` passed: typecheck, ESLint, core build, and 218 Vitest files /
  2575 tests.

Note: full `mise run check-format` is still blocked by existing Hugo template
syntax that Prettier parses as HTML, unrelated to this change.

## Follow-up: Compact About UI

The About controls should read as a compact companion to "About this blog",
not as a separate full settings section.

Plan:

- [x] Move About page controls into the Site section beneath the blog
      description field.
- [x] Render About as a compact status row with short actions.
- [x] Keep navigation toggle visible only when the About page exists.
- [x] Update focused tests and i18n catalogs.
- [x] Run proportionate verification.

Result:

- About now renders as a compact row directly under the "About this blog"
  editor instead of a standalone section.
- Missing state shows a short "Not created" status, compact hint, and a short
  Create button with the full "Create About page" accessible label.
- Ready state keeps Edit/View and the navigation toggle visible without an
  extra card or section heading.
- Desktop and mobile browser checks verified the row stays inside the Site
  section and does not create horizontal overflow.

Follow-up verification:

- `mise run i18n-build` passed; settings catalog missing count is 0 for en,
  zh-Hans, and zh-Hant.
- `mise run test -- src/client/components/__tests__/jant-settings-general.test.ts src/client/components/__tests__/jant-settings-avatar.test.ts src/ui/dash/settings/__tests__/GeneralContent.test.tsx src/i18n/__tests__/fallback.test.ts`
  passed.
- `mise exec -- npx prettier --check ...` passed for the changed UI/test/docs
  files.
- `git diff --check` passed.

## Follow-up: About Grouping Clarity

The compact About row was too visually detached from "About this blog".

Plan:

- [x] Replace the full-width separator with an inset child setting treatment.
- [x] Keep the row compact on mobile and desktop.
- [x] Re-check in browser and run focused verification.

Result:

- About page now uses an inset child setting treatment under "About this blog":
  a subtle left rail, slight background, and no full-width divider.
- Browser checks on desktop and mobile verified the row remains in the About
  field group and has no horizontal overflow.

Verification:

- `mise run test -- src/client/components/__tests__/jant-settings-general.test.ts src/ui/dash/settings/__tests__/GeneralContent.test.tsx`
  passed.
- `mise exec -- npx prettier --check packages/core/src/client/components/jant-settings-general.ts tasks/todo.md`
  passed.
- `git diff --check` passed.

## Follow-up: Simplify About Prompt

The About control should be an inline contextual prompt below the short blog
description, not a child setting block.

Plan:

- [x] Replace the compact About setting block with one inline prompt under
      "About this blog".
- [x] Make existing About pages link to `/about?edit=1`.
- [x] Add a create endpoint that creates the hidden `/about` post and redirects
      to `/about?edit=1`.
- [x] Add client logic that opens the current post editor when an authenticated
      post page loads with `?edit=1`.
- [x] Remove the no-longer-needed navigation toggle and compose prefill plumbing.
- [x] Verify with focused tests and browser checks.

Result:

- Settings now shows a single line:
  `Want to write a fuller introduction? Create About page` or
  `Want to write a fuller introduction? Edit About page`.
- Creating About from settings creates a published `latest_hidden` note at
  `/about`, redirects there, and opens the edit compose dialog.
- Existing About pages link straight to `/about?edit=1`, which opens the edit
  dialog and cleans the URL back to `/about`.

Verification:

- `mise run i18n-build` passed; settings catalog missing count is 0 for en,
  zh-Hans, and zh-Hant.
- `mise run test -- src/services/__tests__/about-page.test.ts src/client/components/__tests__/jant-settings-general.test.ts src/client/components/__tests__/jant-settings-avatar.test.ts src/ui/dash/settings/__tests__/GeneralContent.test.tsx src/client/__tests__/compose-shortcuts.test.ts src/i18n/__tests__/fallback.test.ts`
  passed.
- `mise run test` passed: typecheck, ESLint, core build, and 218 Vitest files /
  2576 tests.
- Browser check on `http://localhost:19020/settings/general` verified both the
  create flow and the ready-state edit link. Creating About redirected to
  `/about` and opened the edit dialog automatically.
- Mobile browser check verified the inline prompt has no horizontal overflow.
- `mise exec -- npx prettier --check ...` passed for changed code/test/task
  files.
- `git diff --check` passed.

## Follow-up: Draft About Edit Link

If a user manually creates `/about` as a draft, settings currently detects it as
an About page but `/about?edit=1` cannot render because draft post pages 404
before client-side edit auto-open runs.

Plan:

- [x] Allow only authenticated `/about?edit=1` requests to render a draft About
      post for editing.
- [x] Keep normal draft URLs and unauthenticated draft edit URLs as 404.
- [x] Add focused route coverage and run proportionate verification.

Result:

- Draft `/about` posts now remain hidden by default.
- Authenticated `/about?edit=1` can render the draft About page so the existing
  client-side edit auto-open can run.
- Draft edit pages skip article canonical/JSON-LD metadata because they are
  authoring surfaces, not public article pages.

Verification:

- `mise run test -- src/routes/pages/__tests__/draft-about-edit.test.ts src/services/__tests__/about-page.test.ts src/client/__tests__/compose-shortcuts.test.ts`
  passed from `packages/core`.
- `mise run test` passed: typecheck, ESLint, core build, and 219 Vitest files /
  2579 tests.

## Suggested Navigation Links

Navigation settings should suggest common destinations that already exist on the
site, such as `/about` and `/now`, without turning them into built-in system
links. Suggestions should use an Add action and create normal navigation items
that users can edit, reorder, move to More, or delete.

Plan:

- [x] Add a service-level suggested navigation links projection for known paths.
- [x] Detect `/about` and `/now` by resolved path target, not by title.
- [x] Hide suggestions that are already represented by URL or collection id.
- [x] Pass suggestions into `Settings > Navigation`.
- [x] Render suggestions with one-shot Add buttons in the nav manager.
- [x] Add focused service/component coverage and run proportionate verification.

Review:

- `NavItemService.listSuggestedLinks()` now detects `/about` and `/now` via
  `path_registry`, returns only existing navigable targets, skips draft/private
  posts, and hides suggestions already covered by path or collection id.
- `Settings > Navigation` passes suggested links into the nav manager with
  translated target labels.
- The nav manager renders a compact “Suggested links” section with Add buttons.
  Adding a canonical collection creates a collection nav item; page/custom/alias
  targets create normal link nav items.
- The suggestion disappears immediately after Add because the client also
  de-duplicates against current nav state.

Verification:

- `mise run test -- src/services/__tests__/navigation.test.ts src/client/components/__tests__/jant-nav-manager.test.ts src/ui/dash/appearance/__tests__/NavigationContent.test.tsx`
  passed from `packages/core` after typecheck, lint, and build.
- `mise run test` passed: typecheck, ESLint, core build, and 219 Vitest files /
  2586 tests.
- `mise run i18n-build` passed; settings catalog missing count is 0 for en,
  zh-Hans, and zh-Hant.
- `mise exec -- npx prettier --check ...` passed for the changed code/style/task
  files.
- `git diff --check` passed.

## Settings Navigation Copy

The Simplified Chinese settings catalog currently translates some navigation
surface labels as “页眉”, which reads like a document page header rather than the
site navigation area.

Plan:

- [x] Translate the settings navigation entry as “站点导航”.
- [x] Replace navigation-page “页眉” wording with “导航栏” where it refers to nav
      items.
- [x] Use “站点顶部” for non-navigation header identity/avatar copy.
- [x] Run a focused i18n verification.

Review:

- Simplified Chinese now translates the settings navigation entry as “站点导航”.
- Navigation placement copy uses “导航栏” instead of “页眉”.
- Avatar/header identity copy uses “站点顶部” where it is not specifically about
  navigation.

Verification:

- `mise run i18n-build` passed; settings catalog missing count is 0 for en,
  zh-Hans, and zh-Hant.

# Compact Feed Body Headings

## Problem

Post titles in list/feed contexts are `h2`, while headings authored inside the
post body can also render as `h2`. Visually, body headings should not compete
with the post title when the post is shown in a list.

## Plan

- [x] Add feed-scoped CSS that compacts authored body headings from `h1` through
      `h6` without changing detail-page prose.
- [x] Mirror the treatment in the static export theme.
- [x] Add focused regression coverage for the CSS rules.
- [x] Run proportionate verification and document the result.

## Review

Done. Feed/list body headings now use a compact visual ladder. Follow-up
corrections: the first pass only moved `h1`/`h2` to subtitle scale, which the
browser showed as 21.6px and still too close to post-title scale; the next pass
moved them all the way to body scale, which made them read too small.

- `h1`/`h2` render at a token-derived midpoint just above body scale.
- `h3`/`h4` render at body scale.
- `h5`/`h6` render at secondary scale and muted color.

The rules are scoped to live feed/list post bodies and exported Hugo post cards,
so single-post detail prose keeps its normal reading hierarchy.

Verification:

- `mise exec -- npx prettier --check packages/core/src/preset.css packages/core/src/services/export-theme/styles/main.css packages/core/src/ui/feed/__tests__/timeline-cards.test.ts tasks/todo.md tasks/lessons.md`
  passed.
- `mise run test -- src/ui/feed/__tests__/timeline-cards.test.ts` passed from
  `packages/core` (typecheck, ESLint, core build, and 26 Vitest tests).
- `git diff --check` passed.

# Detail Header Spacing

## Problem

On post detail pages, titled notes keep the publish time close to the `h1` title
and then move into the body. The title-to-time gap is a little tight, and the
time-to-body gap can use a touch more breathing room for reading.

## Plan

- [x] Increase the detail title-to-meta gap slightly.
- [x] Increase the meta-to-body gap slightly.
- [x] Add focused CSS regression coverage.
- [x] Run proportionate verification and document the result.

## Review

Done. Detail titled-note headers now have slightly more reading air:

- Title-to-time gap increased from `0.55rem` to `0.7rem`.
- Time-to-body gap increased from `1.5rem` to `1.7rem`.

This keeps the title and timestamp as one header group while separating the
metadata a bit more cleanly from the body.

Verification:

- `mise exec -- npx prettier --check packages/core/src/styles/ui.css packages/core/src/ui/feed/__tests__/timeline-cards.test.ts tasks/todo.md`
  passed.
- `mise run test -- src/ui/feed/__tests__/timeline-cards.test.ts` passed from
  `packages/core` (typecheck, ESLint, core build, and 27 Vitest tests).
- `git diff --check` passed.

# Prose List Indentation

## Problem

Public prose lists currently use `padding-left: 1.625em`, which gives list items
roughly 27px of indentation at the current body size. That reads a bit wide in
Jant's narrow reading column.

## Plan

- [x] Reduce public prose `ul`/`ol` indentation to `1.4em`.
- [x] Mirror the indentation in the Hugo export theme.
- [x] Add focused CSS regression coverage.
- [x] Run proportionate verification and document the result.

## Review

Done. Public prose list indentation is now tighter:

- Live prose `ul`/`ol` padding changed from `1.625em` to `1.4em`.
- Hugo export theme `ul`/`ol` padding changed from `1.625em` to `1.4em`.

This reduces the list text indent from roughly 27px to 23.5px at the current
body size while leaving browser-native marker spacing intact.

Verification:

- `mise exec -- npx prettier --check packages/core/src/preset.css packages/core/src/services/export-theme/styles/main.css packages/core/src/ui/feed/__tests__/timeline-cards.test.ts tasks/todo.md`
  passed.
- `mise run test -- src/ui/feed/__tests__/timeline-cards.test.ts` passed from
  `packages/core` (typecheck, ESLint, core build, and 28 Vitest tests).
- `git diff --check` passed.

## Follow-up: List Item Rhythm

The list indentation is now better, but individual list items still use
`margin-top`/`margin-bottom: 1.2em`, which makes short bullet lists feel too
loose.

Plan:

- [x] Reduce public prose `li` vertical margins to `0.65em`.
- [x] Mirror the rhythm in the Hugo export theme.
- [x] Update focused CSS regression coverage.
- [x] Run proportionate verification and document the result.

Result:

- Live prose `li`/`dt` vertical margins changed from `1.2em` to `0.65em`.
- Hugo export theme `li` margins changed from `1.2em` to `0.65em`.
- List block outer margin remains `1.25em 0`, so lists still separate cleanly
  from surrounding paragraphs while the items inside read as a tighter group.

Verification:

- `mise exec -- npx prettier --check packages/core/src/preset.css packages/core/src/services/export-theme/styles/main.css packages/core/src/ui/feed/__tests__/timeline-cards.test.ts tasks/todo.md`
  passed.
- `mise run test -- src/ui/feed/__tests__/timeline-cards.test.ts` passed from
  `packages/core` (typecheck, ESLint, core build, and 28 Vitest tests).
- `git diff --check` passed.

# Proportional Code Typography

## Problem

Inline code currently uses the fixed `--type-base` token, which computes to
15px while prose body text is 16.8px. That makes inline code feel smaller than
the surrounding sentence instead of integrated with it.

## Plan

- [x] Make inline code size proportional to prose body size.
- [x] Keep code blocks slightly smaller than inline code for dense reading.
- [x] Add focused regression coverage for the token relationship.
- [x] Run proportionate verification and document the result.

## Review

Done. Code typography now tracks prose body size instead of fixed base tokens:

- Inline code uses `calc(var(--type-body-size) * 0.94)`.
- Code blocks use `calc(var(--type-body-size) * 0.9)`.

With the current 16.8px prose body size, inline code computes to about 15.8px
and code blocks to about 15.1px. Exported Hugo themes inherit the same tokens
because export writes the core `tokens.css` into `static/tokens.css`.

Verification:

- `mise exec -- npx prettier --check packages/core/src/styles/tokens.css packages/core/src/ui/feed/__tests__/timeline-cards.test.ts tasks/todo.md`
  passed.
- `mise run test -- src/ui/feed/__tests__/timeline-cards.test.ts` passed from
  `packages/core` (typecheck, ESLint, core build, and 26 Vitest tests).
- `git diff --check` passed.
