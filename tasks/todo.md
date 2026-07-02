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
