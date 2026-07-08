# Live Header Navigation Updates

## Goal

Keep the navigation editor preview, and also apply saved navigation changes to the real site header without a full page reload.

## Plan

- [x] Trace current nav manager save flows and public header rendering.
- [x] Extract/reuse the real header navigation markup as a replaceable fragment.
- [x] Return updated header HTML from nav item API mutations.
- [x] Update the Lit nav manager to apply the returned header fragment after create, update, delete, reorder, and placement changes.
- [x] Add focused tests for the API payload and client header replacement behavior.
- [x] Run targeted verification.

## Results

- Extracted the public header/drawer markup into `SiteHeader`, reused by the normal site layout and a new server-rendered header fragment helper.
- Kept normal `/api/nav-items` responses backward compatible, and added an internal `X-Jant-Site-Header: include` response path that includes `headerHtml`.
- Updated `<jant-nav-manager>` so create, update, delete, reorder, placement moves, system toggles, collection adds, and suggested-link adds apply the returned real header fragment while preserving the editor preview.
- Removed the old nav manager bridge that reloaded the page for update/delete.
- Added listener cleanup for site header navigation before fragment replacement, then re-initializes the new header.
- Verification:
  - `mise run test -- src/client/components/__tests__/jant-nav-manager.test.ts src/client/__tests__/site-header-nav.test.ts src/routes/api/__tests__/nav-items.test.ts src/ui/layouts/__tests__/SiteLayout.test.tsx`
  - `mise run check-format`
  - `mise run check-tests`
