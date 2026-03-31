/**
 * Version and environment detection
 *
 * In Vite dev, `__JANT_DEV__` is replaced with `true` via Vite's `define` config.
 * In production (wrangler/esbuild), the typeof check evaluates to false safely.
 *
 * `__JANT_VERSION__` is replaced by Vite's `define` during both dev and lib build.
 *
 * `__CLIENT_JS_FILE__` and `__CLIENT_AUTH_JS_FILE__` are content-addressed
 * internal paths (e.g. `/_assets/client-HASH.js`) embedded by the Worker build
 * from the Vite client manifest. Used only in production (IS_VITE_DEV=false).
 */

declare const __JANT_DEV__: boolean | undefined;
declare const __JANT_VERSION__: string;
declare const __CLIENT_JS_FILE__: string;
declare const __CLIENT_AUTH_JS_FILE__: string;
declare const __CLIENT_CSS_FILE__: string;
declare const __CLIENT_CJK_CSS_FILE__: string;
declare const __CLIENT_CJK_TC_CSS_FILE__: string;

export const IS_VITE_DEV =
  typeof __JANT_DEV__ !== "undefined" && __JANT_DEV__ === true;

export const CORE_VERSION = __JANT_VERSION__;
export const CLIENT_JS_FILE = __CLIENT_JS_FILE__;
export const CLIENT_AUTH_JS_FILE = __CLIENT_AUTH_JS_FILE__;
export const CLIENT_CSS_FILE = __CLIENT_CSS_FILE__;
export const CLIENT_CJK_CSS_FILE = __CLIENT_CJK_CSS_FILE__;
export const CLIENT_CJK_TC_CSS_FILE = __CLIENT_CJK_TC_CSS_FILE__;
