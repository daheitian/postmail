# Fix: unify the Tufte→single-column collapse breakpoint (iPad mini 768×1024)

## Problem

The reading layout collapses from the Tufte two-column model (55% text + 45% sidenote
margin) to single-column at **two different, misaligned breakpoints**:

- Post **text column** collapses to `min(100%, 35rem)` at `max-width: 1024px`
  (`preset.css:526`, `ui.css:2106` for the feed divider).
- `--layout-content-width: 100%`, the **sidenote** float→inline collapse, and page padding
  flip at `max-width: 760px` (`tokens.css:381`, `ui.css:2436`).

iPad mini portrait (768px) falls in the **761–1024px dead band**: the column is already
narrowed to 560px, but the token is still `55%` and sidenotes still float. Result:

- **Single image** (`MediaGallery` singleVisual) — width `min(100%, 24rem·ratio, 55%)`
  → ~300px, much narrower than the 560px text column.
- **YouTube link preview** (`.link-preview`) — same `55%` cap → ~308px wide, cropped 16:9.
  Meanwhile an **inline YouTube embed** (`.tiptap-embed-figure`) is full column width
  → the same video renders at two very different sizes.
- **Footnotes/sidenotes** — still `float: right; width: 50%; margin-right: -60%` against a
  560px left-aligned column → pushed into / off the right edge, clipping / horizontal scroll.

Root cause = breakpoint drift. The post column's collapse point (1024px) is the correct one
(below 1024 there is no room for a 45% sidenote gutter). The 760px values are stragglers.

## Strategy (unify to 1024px)

Move the **Tufte-collapse-related** breakpoints from 760px → 1024px so the whole single-column
mode switches as one, matching where the text column already collapses. Leave genuinely
mobile-only breakpoints (frame padding, touch/hover queries, `--site-padding`) at 760px.

Because the image and link-preview widths already consume `--layout-content-width`, flipping
the token at 1024px fixes both **for free** — no TS / component / test changes.

## Edits

- [ ] **`packages/core/src/styles/tokens.css`** — move `--layout-content-width: 100%` out of
      the `@media (max-width: 760px)` block (line ~384) into a new `@media (max-width: 1024px)`
      block. Keep `--site-padding: 1.875rem` at 760px (mobile spacing, unrelated).

- [ ] **`packages/core/src/styles/ui.css`** — change the sidenote collapse block
      `@media (max-width: 760px)` (line ~2436) → `@media (max-width: 1024px)`. Moves the
      float→inline tap-toggle (and `cursor: pointer` affordance) to the same breakpoint.

That's it. Verified no other change is required:

- `MediaGallery.tsx` getSingleVisualWidth and `.link-preview` read the token → auto-fixed.
- feed-divider hr already has its own `max-width: 1024px` override (`ui.css:2106`) → unaffected.
- media-gallery.test.ts asserts the unchanged inline formula string → still passes.

## Side effects to verify (token is shared)

Flipping the token at 1024 also makes these go full-width in the 761–1024 band (previously
55%). Confirm they look right at 768px (likely an improvement — same narrow-column bug class):

- `.collections-page-shell` (`ui.css:1096`; its `≤760 → 100%` override at 1100 becomes redundant)
- `.settings-root` (`components.css:360`; its `≤760 → 100%` override at 365 becomes redundant)

Leave those redundant overrides in place (harmless) unless verification says otherwise.

## Out of scope (flag, do not bundle)

- **Export theme** (`services/export-theme/styles/main.css` + demo mirror) is an independently
  maintained static-export copy with its own breakpoint set, a `min-width: 768px` 2-col gallery
  switch, and **no `.sidenote` rules at all**. The live-site complaint is fixed by the core
  edits above. Ask whether to align the export theme in a separate pass.

## Verification

- [x] `mise run check-lint` — clean.
- [x] media-gallery test (`npx vitest run …/media-gallery.test.ts`) — 6/6 pass; the inline
      width-formula assertion is unchanged, confirming no MediaGallery regression.
- [x] `mise run build` — clean. Inspected the compiled bundle
      (`dist/client/_assets/client-OQ82miLJ.css`): - `--layout-content-width:100%` appears exactly once, inside `@media (max-width:1024px)`. - `--site-padding:1.875rem` stays inside `@media (max-width:760px)`. - sidenote inline-toggle block now under `@media (max-width:1024px)`.
- [x] Breakpoint reasoning for no regression at the extremes: - `>1024px`: 1024 block inactive → token 55%, sidenotes float = Tufte, unchanged. - `≤760px`: 1024 block active (760<1024) → token 100% + sidenotes inline = same as before. - `761–1024px`: NEW → token 100% + sidenotes inline = the fix.
- [ ] Pixel screenshot at 768×1024 NOT run — no browser automation (Playwright/Puppeteer) is
      configured in this repo, and installing a browser stack felt out of proportion for a CSS
      breakpoint relocation. Confirm on-device, or ask to wire up a Playwright check.

## Review

Done. Two CSS edits relocate the Tufte→single-column collapse from a split 760/1024 to a single
1024px boundary:

- `styles/tokens.css` — `--layout-content-width: 100%` moved from `@media (max-width:760px)` to
  a new `@media (max-width:1024px)` block (with a comment pinning it to the post-column +
  sidenote breakpoints). `--site-padding: 1.875rem` left at 760px (mobile spacing).
- `styles/ui.css` — sidenote float→inline-toggle block changed `max-width:760px` →
  `max-width:1024px` (with a comment explaining why the gutter disappears below 1024).

No TS/component/test changes: single-image (`MediaGallery.getSingleVisualWidth`) and the
`.link-preview` YouTube card already read `--layout-content-width`, so flipping the token fixes
both for free. At 768px now: images + link cards fill the column, the inline YouTube embed
matches the link card, and footnotes inline instead of clipping off the right edge.

Shared-token side effect (intended): `.collections-page-shell` and `.settings-root` also go
full-width in 761–1024px (their `≤760 → 100%` overrides are now redundant but harmless). Same
narrow-column-bug class — an improvement.

Out of scope: the export-theme static copy (own breakpoints, no sidenote rules) — left for a
separate pass if wanted.
