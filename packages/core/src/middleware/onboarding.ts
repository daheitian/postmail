/**
 * Onboarding Middleware
 *
 * Redirects all requests to /setup if onboarding hasn't been completed.
 * Caches the result in memory so the DB is only queried once per isolate lifetime.
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../app.js";

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
    if (onboardingComplete) {
      return next();
    }

    const path = new URL(c.req.url).pathname;
    if (shouldBypass(path)) {
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

function shouldBypass(path: string): boolean {
  return (
    path === "/setup" ||
    path === "/health" ||
    path === "/signin" ||
    path === "/signout" ||
    path === "/reset" ||
    path.startsWith("/api/auth/")
  );
}

/**
 * Reset the onboarding cache. Only for testing.
 * @internal
 */
export function resetOnboardingCache() {
  onboardingComplete = false;
}
