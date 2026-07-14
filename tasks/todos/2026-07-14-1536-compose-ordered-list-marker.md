# Compose ordered-list marker clipping

## Plan

- [x] Confirm why two-digit ordered-list markers are clipped in compose.
- [x] Give ordered lists enough marker space without changing unordered-list rhythm.
- [x] Add a focused regression assertion.
- [x] Verify the affected compose surfaces and document the result.
- [x] Tighten nested ordered-list indentation and vertical spacing.
- [x] Use decimal, lower-alpha, and lower-roman markers for the first three levels.
- [x] Keep live, exported, and compose list markers consistent.

## Review / Results

- Split ordered-list indentation from unordered-list indentation in both regular
  and compact reply compose layouts.
- Increased ordered-list marker space from `1.4em`/`1.5em` to `2.25em`, which
  keeps multi-digit decimal markers inside the editor's horizontal scroll area.
- Added CSS regression assertions for regular and reply compose ordered lists.
- Focused verification: `mise run check-tests-watch -- --run
src/ui/feed/__tests__/timeline-cards.test.ts` (31 tests passed).
- Browser visual verification was unavailable because the browser runtime had no
  connected browser instance; the local debug server itself started correctly.

### Nested-list follow-up

- Kept the top-level compose indentation at `2.25em` so multi-digit markers stay
  visible, while nested ordered lists use a tighter `1.75em` indentation.
- Reduced nested compose ordered-list vertical margins to `0.4em` (`0.2em` in
  compact reply compose) so child items stay visually attached to their parent.
- Added explicit `decimal` → `lower-alpha` → `lower-roman` marker progression and
  synced it across compose, live prose, and static exports.
- Focused verification: 31 timeline-card tests passed; the production build and
  CSS compilation completed.
