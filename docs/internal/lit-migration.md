# Lit Web Components Migration

Tracking document for migrating complex Datastar components to Lit Web Components.

## Migration Order

| #   | Component      | Target Tag                | Lines | Priority | Status  |
| --- | -------------- | ------------------------- | ----- | -------- | ------- |
| 1   | ComposeDialog  | `<jant-compose-dialog>`   | 770   | High     | Done    |
| 2   | GeneralContent | `<jant-settings-general>` | 534   | High     | Done    |
| 3   | CollectionForm | `<jant-collection-form>`  | 358   | Medium   | Pending |
| 4   | PostForm       | `<jant-post-form>`        | 359   | Optional | Pending |

## Component Decomposition Plans

### ComposeDialog (770 lines, 19 signals) — Done

Split into 2 sub-components + bridge:

- `<jant-compose-dialog>` — outer shell: header, format switcher, collection selector, action row, media picker
- `<jant-compose-editor>` — format-specific content editing, star rating, attached text panel, tools row
- `compose-bridge.ts` — server communication (JSON POST to `/compose`), media picker loading, toasts

### GeneralContent (534 lines) — Done

Split into 2 sub-components + bridge:

- `<jant-settings-general>` — general/footer/SEO form sections with dirty tracking
- `<jant-settings-avatar>` — avatar preview, upload, remove, display-in-header toggle
- `settings-bridge.ts` — server communication (JSON POST to settings endpoints), toasts

### CollectionForm (358 lines)

Likely a single component, split only if needed:

- `<jant-collection-form>` — full form with drag-and-drop ordering

### PostForm (359 lines)

Optional migration. Evaluate after higher-priority components are done.

## Per-Component Migration Checklist

For each component migration:

- [ ] Identify all Datastar signals and map to Lit properties/state
- [ ] Identify server communication points (SSE, form submissions)
- [ ] Design event interface (`jant:` prefixed CustomEvents)
- [ ] Implement Light DOM component with static `properties`
- [ ] Ensure `createRenderRoot() { return this; }` — no Shadow DOM
- [ ] Add `disconnectedCallback()` cleanup
- [ ] Server renders skeleton/fallback inside custom element tag
- [ ] Write tests using happy-dom
- [ ] Verify BaseCoat/Tailwind classes work correctly
- [ ] Keep each file under 300 lines
- [ ] Run `mise run test` — all tests pass
- [ ] Run TypeScript checks — no errors

## Session Notes

### Session 1 — Foundation

- Installed `lit` and `happy-dom`
- Added Lit Web Components section to CLAUDE.md
- Configured TypeScript (client include, server exclude)
- Created `src/ui/components/` directory structure
- Decision: Use static `properties` pattern, not decorators (SWC config compatibility)

### Session 2 — ComposeDialog Migration

- Migrated ComposeDialog (770 lines Datastar) → 2 Lit components + bridge (~650 lines total)
- `jant-compose-dialog.ts` (~280 lines): header, format switcher, collection selector, action row
- `jant-compose-editor.ts` (~270 lines): format-specific fields, star rating, attached text, tools row
- `compose-bridge.ts` (~100 lines): JSON POST to `/compose`, media picker, toasts
- `compose-types.ts` (~55 lines): shared types (ComposeLabels, ComposeSubmitDetail, etc.)
- Added JSON response mode to compose route (Accept: application/json)
- Server template slimmed to ~120 lines (labels + collections JSON, skeleton fallback)
- Architecture: Lit manages form state, bridge handles fetch + side effects
- Decision: No Shadow DOM (Light DOM for BaseCoat/Tailwind compatibility)
- Decision: JSON route + bridge script (not Datastar SSE) for server communication

### Session 3 — GeneralContent Migration

- Migrated GeneralContent (534 lines Datastar) → 2 Lit components + bridge (~600 lines total)
- `jant-settings-general.ts` (~290 lines): general/footer/SEO forms with independent dirty tracking
- `jant-settings-avatar.ts` (~230 lines): avatar preview, upload, remove, display toggle
- `settings-bridge.ts` (~120 lines): JSON POST to settings endpoints, sidebar name update, toasts
- `settings-types.ts` (~60 lines): shared types (SettingsLabels, SettingsSaveDetail, etc.)
- Added JSON response modes to 5 settings POST routes (general, footer, seo, avatar/display, avatar/remove)
- Server template slimmed to ~215 lines (labels + timezones + languages as JSON, initial data in script tag)
- Form data passed via `<script type="application/json">` rather than attributes (too large for timezone list)
- Avatar upload still uses existing `avatar-upload.ts` script (event delegation via `[data-avatar-upload]`)
- Fix: `createRenderRoot()` must clear `innerHTML` to remove SSR fallback skeleton (also applied to compose dialog)
