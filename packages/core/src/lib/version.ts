/**
 * Version and environment detection
 *
 * In Vite dev, `__JANT_DEV__` is replaced with `true` via Vite's `define` config.
 * In production (wrangler/esbuild), the typeof check evaluates to false safely.
 *
 * `__JANT_VERSION__` is replaced by Vite's `define` during both dev and lib build.
 */

declare const __JANT_DEV__: boolean | undefined;
declare const __JANT_VERSION__: string;

export const IS_VITE_DEV =
  typeof __JANT_DEV__ !== "undefined" && __JANT_DEV__ === true;

export const CORE_VERSION = __JANT_VERSION__;
