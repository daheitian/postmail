/**
 * i18n Hono Middleware
 */

import type { MiddlewareHandler } from "hono";
import type { I18n } from "@lingui/core";
import { createI18n, isLocale, baseLocale, type Locale } from "./i18n.js";
import { detectLocaleFromHeader } from "./detect.js";
import { ONBOARDING_STATUS } from "../lib/constants.js";
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
 * Language comes from the persisted SITE_LANGUAGE setting once onboarding is
 * complete. During setup, the middleware may still use Accept-Language so the
 * first-run UI matches the browser before the setting is saved.
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
      } else if (
        allSettings["ONBOARDING_STATUS"] !== ONBOARDING_STATUS.COMPLETED
      ) {
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
