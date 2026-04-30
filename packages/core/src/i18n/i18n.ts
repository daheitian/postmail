/**
 * i18n Runtime using @lingui/core
 *
 * The Lingui SWC plugin compiles message descriptors from `msg()` into
 * hash-based IDs at build time. The runtime then resolves those IDs against
 * the active locale catalog for each request.
 */

import type {
  I18n as LinguiI18n,
  MessageDescriptor,
  Messages,
} from "@lingui/core";
import { I18n as LinguiI18nRuntime } from "@lingui/core";
import {
  locales,
  baseLocale,
  isLocale,
  isValidContentLanguage,
  normalizeContentLanguage,
  resolveCatalogLocale,
  type Locale,
} from "./locales.js";
import { messages as publicEn } from "./locales/public/en.js";
import { messages as settingsEn } from "./locales/settings/en.js";
import { messages as settingsZhHans } from "./locales/settings/zh-Hans.js";
import { messages as settingsZhHant } from "./locales/settings/zh-Hant.js";

export {
  locales,
  baseLocale,
  isLocale,
  isValidContentLanguage,
  normalizeContentLanguage,
  resolveCatalogLocale,
  type Locale,
};

export type TranslationValues = Record<string, unknown>;
export type TranslationMessage = {
  id?: string;
  message?: string;
  comment?: string;
};

// Export I18n type for convenience, with the descriptor overloads used in app code.
export interface I18n extends LinguiI18n {
  _(
    id: string,
    values?: TranslationValues,
    message?: TranslationMessage,
  ): string;
  _(descriptor: MessageDescriptor, values?: TranslationValues): string;
}

// The `en` runtime catalog merges both surfaces. For non-English locales we
// merge the English `public` catalog under the translated `settings` catalog
// so that public-surface strings (e.g. site header nav labels, which render
// on every admin page too) resolve to their English source at runtime instead
// of falling through to the compiled hash id. The SWC plugin strips the
// `message` descriptor fallback in production builds, so without this merge
// any key missing from the active locale would render as its hash (`JqJ5Xv`,
// `muKqfV`, etc.) on zh-* pages.
const catalogEn: Messages = { ...publicEn, ...settingsEn };
const catalogZhHans: Messages = { ...publicEn, ...settingsZhHans };
const catalogZhHant: Messages = { ...publicEn, ...settingsZhHant };

/**
 * Create a new i18n instance for a specific locale.
 * IMPORTANT: In Cloudflare Workers (concurrent environment), we must create
 * a new instance per request to avoid race conditions. Never use a global instance!
 */
export function createI18n(locale: Locale): I18n {
  const i18n = new LinguiI18nRuntime({}) as I18n;

  i18n.load("en", catalogEn);
  i18n.load("zh-Hans", catalogZhHans);
  i18n.load("zh-Hant", catalogZhHant);

  i18n.activate(locale);

  return i18n;
}

/**
 * Helper to get the per-request i18n instance from Hono context.
 * Use this in route handlers.
 *
 * @example
 * import { msg } from "@lingui/core/macro";
 * import { getI18n } from "../i18n/index.js";
 *
 * const i18n = getI18n(c);
 * const title = i18n._(msg({ message: "Settings", comment: "@context: Page title" }));
 */
export function getI18n(c: { get(key: "i18n"): I18n }): I18n {
  return c.get("i18n");
}
