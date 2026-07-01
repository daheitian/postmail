# Fix: Collection Thread Bumps From Non-Quiet Replies

## Problem

A `latest_hidden` thread root inside a collection does not move back to the top
of that collection when a later non-quiet reply is published. Only quiet replies
should avoid bumping the thread. Collection ordering should use thread activity
for normal replies, even when the root is hidden from Latest.

## Plan

- [x] Inspect collection timeline and feed ordering queries.
- [x] Add regression coverage for hidden collection roots, normal replies, and
      quiet replies.
- [x] Update the service-layer ordering so collection pages/feed use thread
      activity where appropriate.
- [x] Run focused tests and record verification.

## Review

Done. Collection timeline and collection feed ordering now use the thread
root's `lastActivityAt` as the newest/activity sort key. A normal published
reply already updates that root timestamp, so a `latest_hidden` root inside a
collection moves back to the top when it receives a non-quiet reply. A quiet
reply leaves `lastActivityAt` unchanged, so it does not bump the thread.

The ordering helper stays in `PostService`; routes continue to ask the service
for ordered thread roots/feed entries and do not duplicate collection/thread
business logic.

Regression coverage was added for:

- hidden collection roots bumped by non-quiet replies
- quiet replies not bumping collection threads
- collection feeds using thread activity from replies

Verification:

- `mise run test -- src/services/__tests__/post-timeline.test.ts` passed:
  1 file, 25 tests.
- `mise run check-tests` passed: 216 files, 2562 tests.
- `mise run check-lint` passed.
