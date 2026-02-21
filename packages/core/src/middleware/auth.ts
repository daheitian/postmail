/**
 * Authentication Middleware
 *
 * Protects routes by requiring authentication
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { DomainError, UnauthorizedError } from "../lib/errors.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

/**
 * Middleware that requires authentication.
 * Redirects to signin page if not authenticated.
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
 * Returns 401 if not authenticated.
 */
export function requireAuthApi(): MiddlewareHandler<Env> {
  return async (c, next) => {
    try {
      const session = await c.var.auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!session?.user) {
        throw new UnauthorizedError();
      }

      await next();
    } catch (err) {
      if (err instanceof DomainError) throw err;
      throw new UnauthorizedError();
    }
  };
}
