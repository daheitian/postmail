/**
 * i18n Hono Middleware
 */

import type { MiddlewareHandler } from "hono";
import type { I18n } from "@lingui/core";
import {
  createI18n,
  baseLocale,
  isValidContentLanguage,
  normalizeContentLanguage,
  resolveCatalogLocale,
} from "./i18n.js";

declare module "hono" {
  interface ContextVariableMap {
    /** BCP 47 content language tag for `<html lang>` and RSS metadata. */
    lang: string;
    i18n: I18n;
  }
}

/**
 * Path prefixes that render the admin/settings surface. Requests to these
 * paths activate the catalog locale resolved from the user's configured
 * `SITE_LANGUAGE`; everything else is forced to `baseLocale` (English).
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
 * Two related-but-distinct values are computed per request:
 *
 * - `lang` (used for `<html lang>` and RSS): the verbatim BCP 47 content
 *   language tag the operator configured. Accepts any tag — `fi`, `de`,
 *   `fr-CA`, etc. — independent of whether Jant has a dashboard catalog.
 * - The active i18n locale: the catalog Jant should render the dashboard in.
 *   Resolved from the content language via a fallback chain (exact catalog
 *   match → language family → `baseLocale`). On non-admin routes it is
 *   always `baseLocale` so public chrome stays English regardless.
 */
export function i18nMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const rawSetting = c.get("allSettings")?.SITE_LANGUAGE;
    const contentLang = isValidContentLanguage(rawSetting)
      ? normalizeContentLanguage(rawSetting)
      : baseLocale;
    const catalogLocale = resolveCatalogLocale(contentLang);
    const uiLang = isAdminPath(c.req.path) ? catalogLocale : baseLocale;
    const i18n = createI18n(uiLang);

    c.set("lang", contentLang);
    c.set("i18n", i18n);
    await next();
  };
}
