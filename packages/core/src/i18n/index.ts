/**
 * i18n Module
 *
 * IMPORTANT: This module is designed for concurrent environments (Cloudflare Workers).
 * We create a new i18n instance per request to avoid race conditions.
 *
 * This module exposes the request-scoped Lingui runtime used by Hono JSX
 * renders. Components should read the current request's i18n instance from
 * the local context hook and translate message descriptors with `i18n._(...)`.
 *
 * Usage:
 * ```tsx
 * import { msg } from "@lingui/core/macro";
 * import { useLingui, Trans, I18nProvider } from "../i18n/index.js";
 *
 * // Wrap your app in I18nProvider (automatically done by BaseLayout when c is provided)
 * c.html(
 *   <I18nProvider c={c}>
 *     <MyApp />
 *   </I18nProvider>
 * );
 *
 * // Inside components, use useLingui() hook
 * function MyApp() {
 *   const { i18n } = useLingui();
 *
 *   return (
 *     <div>
 *       <h1>{i18n._(msg({ message: "Settings", comment: "@context: Page title" }))}</h1>
 *       <Trans comment="@context: Help text">
 *         Read the <a href="/docs">documentation</a>
 *       </Trans>
 *     </div>
 *   );
 * }
 * ```
 */

// Core i18n runtime
export {
  createI18n,
  getI18n,
  locales,
  baseLocale,
  isLocale,
  type Locale,
  type I18n,
} from "./i18n.js";

// I18nProvider and useLingui hook for request-scoped Hono JSX rendering
export { I18nProvider, useLingui } from "./context.js";

// Trans component (simplified for Hono JSX)
export { Trans } from "./Trans.js";

// Language detection utilities
export {
  isValidLanguage,
  getLanguageDisplayName,
  getSupportedLanguages,
  detectLocaleFromHeader,
} from "./detect.js";

// Hono middleware
export { i18nMiddleware } from "./middleware.js";
