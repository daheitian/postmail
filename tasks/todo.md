# Tune: Reply Composer Typography Scale

## Problem

Reply compose uses the same large form typography as the full composer. Because
the replied-to context is intentionally smaller, note/link/quote fields in reply
mode can feel oversized and out of proportion.

## Plan

- [x] Inspect compose typography tokens and reply-scoped CSS.
- [x] Add a reply-only compact typography scale for note body, title, link, and
      quote fields.
- [x] Update focused CSS coverage.
- [x] Run proportionate verification and record results.

## Review

Done. Reply compose now has a compact typography scale scoped to
`compose-reply-compose-layout`:

- title and link title fields use `--type-content-subtitle`, keeping them above
  body text without returning to the full desktop compose title size
- quote textarea uses `--type-secondary`
- URL/author/source inputs use `--type-base`
- TipTap body text keeps the normal content body size for readability, with
  slightly tighter reply-only paragraph margins
- rich headings pasted into reply bodies are capped to `--type-secondary`

The full composer keeps its existing larger typography. Focused CSS coverage was
updated to lock the reply-only typography variables and TipTap body size.

Verification:

- `mise run test -- src/client/components/__tests__/jant-compose-dialog.test.ts`
  passed from `packages/core`: typecheck, full ESLint, build, and 123 Vitest
  tests.
