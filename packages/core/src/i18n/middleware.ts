/**
 * i18n Hono Middleware
 */

import type { MiddlewareHandler } from "hono";
import type { I18n } from "@lingui/core";
import { createI18n, baseLocale, type Locale } from "./i18n.js";

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
 * Currently only English is supported. The framework is preserved so additional
 * locales can be added later.
 */
export function i18nMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const lang: Locale = baseLocale;
    const i18n = createI18n(lang);

    c.set("lang", lang);
    c.set("i18n", i18n);
    await next();
  };
}
