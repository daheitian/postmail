/**
 * Onboarding Middleware
 *
 * Redirects key page routes to /setup if onboarding hasn't been completed.
 * Uses an allowlist approach: only explicitly listed page routes are redirected,
 * so static assets, API endpoints, feeds, and other resources always pass through.
 * Caches the result in memory so the DB is only queried once per isolate lifetime.
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

/** In-memory cache — persists across requests within a Worker isolate */
let onboardingComplete = false;

/**
 * Middleware that redirects to /setup if onboarding is not complete.
 * Uses module-level caching: once onboarding is confirmed complete,
 * no further DB queries are made for the lifetime of the Worker isolate.
 */
export function requireOnboarding(): MiddlewareHandler<Env> {
  return async (c, next) => {
    const path = new URL(c.req.url).pathname;

    if (onboardingComplete) {
      return next();
    }

    if (!shouldRedirect(path)) {
      return next();
    }

    const isComplete = await c.var.services.settings.isOnboardingComplete();
    if (isComplete) {
      onboardingComplete = true;
      return next();
    }

    return c.redirect("/setup");
  };
}

/**
 * Only these page routes are redirected to /setup during onboarding.
 * Everything else (assets, API, feeds, media, etc.) passes through.
 */
function shouldRedirect(path: string): boolean {
  return (
    path === "/" ||
    path === "/signin" ||
    path === "/reset" ||
    path.startsWith("/settings")
  );
}

/**
 * Reset the onboarding cache. Only for testing.
 * @internal
 */
export function resetOnboardingCache() {
  onboardingComplete = false;
}
