/**
 * i18n Hono Middleware
 */

import type { MiddlewareHandler } from "hono";
import type { I18n } from "@lingui/core";
import { createI18n, isLocale, baseLocale, type Locale } from "./i18n.js";
import { detectLocaleFromHeader } from "./detect.js";
declare module "hono" {
  interface ContextVariableMap {
    lang: Locale;
    i18n: I18n;
  }
}

/**
 * Hono middleware for internationalization.
 * Creates a per-request i18n instance to avoid race conditions in concurrent environments.
 *
 * Language is determined by the database SITE_LANGUAGE setting (single source of truth).
 * Falls back to the default locale (en) if not set.
 */
export function i18nMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    let lang: Locale = baseLocale;

    const allSettings = c.get("allSettings") as
      | Record<string, string>
      | undefined;
    if (allSettings) {
      const siteLang = allSettings["SITE_LANGUAGE"];
      if (siteLang && isLocale(siteLang)) {
        lang = siteLang;
      } else {
        const acceptLanguage = c.req.header("Accept-Language");
        if (acceptLanguage) {
          lang = detectLocaleFromHeader(acceptLanguage);
        }
      }
    }

    // Create a new i18n instance for this request to avoid race conditions
    const i18n = createI18n(lang);

    c.set("lang", lang);
    c.set("i18n", i18n);
    await next();
  };
}
