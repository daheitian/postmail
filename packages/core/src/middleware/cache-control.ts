/**
 * Cache-Control Middleware
 *
 * Sets a safe default `Cache-Control` on responses that don't declare one.
 *
 * Almost every Jant page is auth-variant: the same URL renders differently
 * for the signed-in author (nav, the "more" menu, edit affordances) than for
 * an anonymous visitor. A shared/CDN cache keyed only by URL must therefore
 * never store these pages — otherwise it serves a stale or wrong-audience
 * snapshot, which both breaks the UI ("you still look signed out", "your edit
 * didn't take effect") and can leak the authenticated dashboard to the public.
 *
 * Jant is self-hosted software that runs behind whatever reverse proxy or CDN
 * the operator chooses, so it cannot rely on infrastructure config to get
 * this right — it must declare its own cache policy. The critical mistake is
 * emitting `Cache-Control: public`: that word is an explicit invitation for
 * any shared cache to store the response.
 *
 * Routes that serve genuinely public, auth-invariant resources (media, feeds,
 * sitemaps, favicons, manifests, static assets) set their own `Cache-Control`
 * explicitly; this middleware leaves those untouched and only fills in the
 * default for the un-annotated dynamic responses.
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

/**
 * Default cache directive for dynamic, potentially auth-variant responses.
 * `private` forbids shared/CDN caches from storing the response; `no-store`
 * prevents any cache (including the browser) from keeping a copy.
 */
const DEFAULT_CACHE_CONTROL = "private, no-store";

/**
 * Middleware that defaults a missing `Cache-Control` header to
 * `private, no-store`.
 *
 * Runs after the route handler: if the handler (or an inner middleware)
 * already set `Cache-Control`, that explicit value wins. Only responses that
 * declare nothing receive the safe default.
 *
 * @returns Hono middleware enforcing the default cache policy.
 *
 * @example
 * ```ts
 * app.use("*", defaultCacheControl());
 * ```
 */
export function defaultCacheControl(): MiddlewareHandler<Env> {
  return async (c, next) => {
    await next();
    if (!c.res.headers.has("Cache-Control")) {
      c.res.headers.set("Cache-Control", DEFAULT_CACHE_CONTROL);
    }
  };
}
