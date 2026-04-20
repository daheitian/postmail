/**
 * Session Middleware
 *
 * Runs once per request (after runtime init) to look up the better-auth
 * session and stash it on `c.var.session` / `c.var.isAuthenticated`.
 *
 * This replaces ad-hoc `auth.api.getSession()` calls scattered across
 * view helpers (e.g. `lib/navigation.ts`) so each request only parses
 * the session cookie once. better-auth's own cookieCache (5 min) still
 * keeps this cheap, but centralizing the call also unlocks `Promise.all`
 * patterns in routes that previously serialized on a hidden session fetch.
 *
 * Never throws — any lookup error is treated as "not authenticated".
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export function attachSession(): MiddlewareHandler<Env> {
  return async (c, next) => {
    try {
      const session = await c.var.auth.api.getSession({
        headers: c.req.raw.headers,
      });
      c.set("session", session ?? null);
      c.set("isAuthenticated", !!session?.user);
    } catch {
      c.set("session", null);
      c.set("isAuthenticated", false);
    }
    await next();
  };
}
