# Fix: reply shortcut should target thread tail on root detail pages

## Problem

On a thread detail page with replies, opening the root URL and pressing `r`
opens a reply composer for the current/root post. Submitting then fails with:

- `This post is no longer the end of the thread. Reply to the latest post instead.`

The server-side guard is correct. The client shortcut should choose the latest
rendered thread item as the reply target when no specific post is hovered.

## Plan

- [x] Inspect the compose shortcut and compose-launch target selection.
- [x] Change detail-page reply target selection so `r` defaults to the last
      `.thread-detail-item article[data-post]`.
- [x] Preserve existing hover behavior for explicit post actions.
- [x] Preserve timeline/list behavior outside post detail pages.
- [x] Add focused tests for root-detail tail reply selection.
- [x] Run focused verification and document results.

## Review

Done. The `r` shortcut now uses a dedicated reply-target resolver instead of
the edit/menu target resolver. On thread detail pages, it selects the last
rendered `.thread-detail-item article[data-post]`, so opening the root URL of a
thread and pressing `r` replies to the latest post. This also avoids the
browser `:hover` state accidentally picking the root article under the cursor.

`e`, `c`, and `f` still use the existing current/hover resolver, so edit,
collection, and featured shortcuts keep their previous explicit-post behavior.
Outside thread detail pages, reply target selection falls back to the existing
current/hover behavior.

Verification:

- `mise run test -- src/client/__tests__/compose-launch.test.ts src/client/__tests__/compose-shortcuts.test.ts`
  passed: 2 files, 15 tests.
- That mise task also completed full workspace typecheck, ESLint, and the core
  library build before running Vitest.
