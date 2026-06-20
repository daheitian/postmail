# Split language into Content language + Dashboard language

## Goal

Today one setting `SITE_LANGUAGE` does two jobs (public `<html lang>`/RSS content
language AND the admin dashboard UI locale). Split them:

- **Content language** = keep `SITE_LANGUAGE`. Any BCP 47 tag. Drives `<html lang>`
  - RSS. Picker shows the full curated list again (no coverage filter, no tag chip,
    no "% translated"). Adds a live `<html lang="...">` preview.
- **Dashboard language** = new KV setting `DASHBOARD_LANGUAGE`. Restricted to the 3
  translated catalog locales (en / zh-Hans / zh-Hant). Optional — when unset the
  dashboard derives its locale from the content language exactly as today.

No DB migration (settings are key/value). No backfill (unset → derive = current
behaviour, so existing sites are unchanged until the owner picks a dashboard
language).

## Decisions

- (a) Onboarding keeps silent browser auto-detection (no new visible field). Seeds
  BOTH `SITE_LANGUAGE` and `DASHBOARD_LANGUAGE` from the detected catalog locale.
  No "Dashboard language" wording at setup.
- (b) Content picker drops tag + "% translated"; adds live `<html lang="...">`
  preview (i18n prose + runtime tag rendered as escaped text in `<code>`).
- Dashboard picker = native `<select>` with 3 options (English / 简体中文 / 繁體中文),
  no "Auto" option. Route passes the EFFECTIVE (resolved) dashboard locale as the
  selected value; saving materialises/pins it.
- Keep the earlier visual dropdown fix (bordered box + chevron + w-fit) on the
  content picker; only revert the coverage filter.

## Edits

### Config / types

- [ ] `types/config.ts`: add `DASHBOARD_LANGUAGE` to `CONFIG_FIELDS`; add
      `dashboardLanguage: string` to `AppConfig`.
- [ ] `lib/resolve-config.ts`: `dashboardLanguage: resolve("DASHBOARD_LANGUAGE", …)`.
- [ ] `types/bindings.ts`: `DASHBOARD_LANGUAGE?: EnvBindingValue`.

### Behaviour

- [ ] `i18n/middleware.ts`: `dashboardLocale = isLocale(DASHBOARD_LANGUAGE) ?
    DASHBOARD_LANGUAGE : resolveCatalogLocale(contentLang)`; `uiLang = isAdmin ?
    dashboardLocale : baseLocale`.
- [ ] `services/settings.ts`: extend `LocaleSettingsData` + `GeneralSettingsData`
      with `dashboardLanguage`; in `updateLocaleSettings` validate via `isLocale`
      (empty allowed → remove key), set/remove `DASHBOARD_LANGUAGE`, return a
      combined `localeChanged` (language OR dashboard changed) for reload.
- [ ] `routes/dash/settings.tsx`: extend `UpdateLocaleSettingsSchema` with
      `dashboardLanguage`; thread `oldDashboardLanguage`; pass resolved
      `dashboardLanguage` to GeneralContent.
- [ ] `services/bootstrap.ts`: also `settings.set("DASHBOARD_LANGUAGE", catalog)`.

### Viewmodel + client

- [ ] `ui/dash/settings/GeneralContent.tsx`: new prop + initial-data field + labels.
- [ ] `client/components/settings-types.ts`: add to `SettingsInitialData` +
      `SettingsLabels`.
- [ ] `client/settings-bridge.ts`: parse `dashboardLanguage`.
- [ ] `client/components/jant-settings-general.ts`: dashboard state/select; revert
      content filter; drop tag + %; add html-lang preview.

### Tests

- [ ] component, middleware, settings service, resolve-config, setup/bootstrap.

### Verify

- [ ] `mise run check-tests` + `mise run check-lint`; screenshots desktop + mobile.

## Review

Done. `SITE_LANGUAGE` is now the content language only; new optional KV setting
`DASHBOARD_LANGUAGE` drives the admin UI (empty → derive from content, so
existing sites are unchanged). No DB migration, no backfill.

- Config: `DASHBOARD_LANGUAGE` in `CONFIG_FIELDS` + `AppConfig.dashboardLanguage`
  - resolve-config + env binding.
- Middleware: `uiLang = isLocale(DASHBOARD_LANGUAGE) ? it : resolveCatalogLocale(content)`.
- Service: `updateLocaleSettings` validates (isLocale, empty=clear), folds change
  into `languageChanged`. Bootstrap pins `DASHBOARD_LANGUAGE` from detected catalog.
- UI: content picker restored to full list, dropped tag + "% translated", added a
  live `<html lang="…">` preview; new 3-option Dashboard language `<select>`.
- i18n: 5 new/changed settings strings, translated to zh-Hans/zh-Hant; catalogs
  rebuilt, coverage 100%.

Verified: `check-types`, `check-tests` (2493), `check-lint` all green. Screenshots:
content picker (full list, no tag/%), live html-lang preview, dashboard select.
End-to-end: setting Dashboard = 简体中文 flips the admin UI to Chinese (`常规`…)
while `html lang` stays `en` — content and dashboard are decoupled.

NOTE: `styles/tokens.css` + `services/export-theme/assets/{client-site.css,js}`
show as modified but are NOT part of this work (pre-existing mobile-typography WIP

- build regeneration). Left untouched — exclude from this change's commit.
