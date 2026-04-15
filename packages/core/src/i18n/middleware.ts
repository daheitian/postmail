/**
 * i18n Hono Middleware
 */

import type { MiddlewareHandler } from "hono";
import type { I18n } from "@lingui/core";
import { createI18n, baseLocale, isLocale, type Locale } from "./i18n.js";

declare module "hono" {
  interface ContextVariableMap {
    lang: Locale;
    i18n: I18n;
  }
}

/**
 * Path prefixes that render the admin/settings surface. Requests to these
 * paths activate the user's configured `SITE_LANGUAGE`; everything else is
 * forced to `baseLocale` (English).
 *
 * Why: Lingui computes message IDs from `message` text alone (the `comment`
 * field is a translator note and does not disambiguate). Shared strings like
 * "Latest" / "Featured" collide between public navigation labels and settings
 * controls, so a globally-active zh-Hans catalog would leak settings
 * translations into the public header. Scoping activation by route keeps
 * public pages in English without requiring per-call-site `context:` tags.
 */
const ADMIN_PATH_PREFIXES = ["/settings", "/dash"] as const;

function isAdminPath(path: string): boolean {
  return ADMIN_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Hono middleware for internationalization.
 * Creates a per-request i18n instance to avoid race conditions in concurrent environments.
 *
 * `lang` and the active i18n locale are intentionally decoupled:
 * - `lang` (used for `<html lang>`) always reflects the configured
 *   `SITE_LANGUAGE`, because it describes the *content* language — the
 *   operator's posts — not the UI chrome.
 * - The active i18n locale is `SITE_LANGUAGE` on admin routes (so the
 *   translated settings catalog applies) and forced to `baseLocale`
 *   elsewhere, so public UI strings stay in English even when the content
 *   language is non-English.
 */
export function i18nMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const siteLanguage = c.get("allSettings")?.SITE_LANGUAGE;
    const contentLang: Locale = isLocale(siteLanguage)
      ? siteLanguage
      : baseLocale;
    const uiLang: Locale = isAdminPath(c.req.path) ? contentLang : baseLocale;
    const i18n = createI18n(uiLang);

    c.set("lang", contentLang);
    c.set("i18n", i18n);
    await next();
  };
}
