/**
 * Authentication Middleware
 *
 * Protects routes by requiring authentication via session cookies
 * or Bearer API tokens.
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { UnauthorizedError } from "../lib/errors.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

/**
 * Middleware that requires authentication.
 * Redirects to signin page if not authenticated.
 * Session-only — Bearer tokens are not accepted for dashboard pages.
 */
export function requireAuth(redirectTo = "/signin"): MiddlewareHandler<Env> {
  return async (c, next) => {
    try {
      const session = await c.var.auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!session?.user) {
        return c.redirect(redirectTo);
      }

      await next();
    } catch {
      return c.redirect(redirectTo);
    }
  };
}

/**
 * Middleware for API routes that requires authentication.
 * Tries session auth first, then falls back to Bearer API token.
 * Returns 401 if neither method succeeds.
 */
export function requireAuthApi(): MiddlewareHandler<Env> {
  return async (c, next) => {
    // 1. Try session auth (existing behavior)
    try {
      const session = await c.var.auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (session?.user) {
        await next();
        return;
      }
    } catch {
      // Session check failed — fall through to Bearer token
    }

    // 2. Try Bearer token auth
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const rawToken = authHeader.slice(7);
      const tokenId = await c.var.services.apiTokens.verify(rawToken);
      if (tokenId) {
        // Fire-and-forget last-used update (non-blocking)
        const updatePromise = c.var.services.apiTokens.updateLastUsed(tokenId);
        try {
          c.executionCtx.waitUntil(updatePromise);
        } catch {
          // executionCtx not available (e.g. in tests) — ignore
        }
        await next();
        return;
      }
    }

    throw new UnauthorizedError();
  };
}
