/**
 * Request-scoped i18n access for Hono JSX renders.
 */

import type { Context } from "hono";
import type { FC, PropsWithChildren } from "hono/jsx";
import type { I18n } from "./i18n.js";
import { getI18n as getI18nFromContext } from "./i18n.js";

// Store i18n instance during render
let currentI18n: I18n | null = null;

/**
 * I18nProvider - binds the current request's i18n instance for this render.
 *
 * @example
 * ```tsx
 * import { I18nProvider } from "../i18n/index.js";
 *
 * return c.html(
 *   <I18nProvider c={c}>
 *     <YourApp />
 *   </I18nProvider>
 * );
 * ```
 */
export interface I18nProviderProps extends PropsWithChildren {
  c: Context;
}

export const I18nProvider: FC<I18nProviderProps> = ({ c, children }) => {
  // Set current i18n for this render
  // Note: In Hono JSX, rendering is synchronous and single-threaded per request
  // so we can safely set global context without cleanup
  currentI18n = getI18nFromContext(c);
  return <>{children}</>;
};

/**
 * useLingui hook - returns the current render's per-request i18n instance.
 * Application code should prefer `const { i18n } = useLingui();`
 * and call `i18n._(msg(...), values?)`.
 *
 * @example
 * ```tsx
 * import { msg } from "@lingui/core/macro";
 * import { useLingui } from "../i18n/index.js";
 *
 * function MyComponent() {
 *   const { i18n } = useLingui();
 *
 *   return (
 *     <div>
 *       <h1>{i18n._(msg({ message: "Settings", comment: "@context: Page title" }))}</h1>
 *     </div>
 *   );
 * }
 * ```
 */
export function useLingui() {
  if (!currentI18n) {
    throw new Error(
      "useLingui() called outside of I18nProvider. " +
        "Make sure your component is wrapped in <I18nProvider c={c}>...</I18nProvider>",
    );
  }

  return {
    i18n: currentI18n,
  };
}
