/**
 * Authentication Middleware
 *
 * Protects routes by requiring authentication via session cookies
 * or Bearer API tokens.
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { getDevApiToken, getSiteUrl } from "../lib/env.js";
import { UnauthorizedError } from "../lib/errors.js";
import { getSitePathPrefix, toPublicHref } from "../lib/url.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

/**
 * Checks whether a hostname is local (dev environment).
 *
 * @param hostname - The hostname to check
 * @returns `true` for localhost, 127.0.0.1, ::1, and *.localtest.me
 *
 * @example
 * ```ts
 * isLocalHostname("localhost") // true
 * isLocalHostname("myblog.com") // false
 * ```
 */
export function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localtest.me")
  );
}

function getRequestHostname(
  requestUrl: string,
  requestHost?: string,
): string | null {
  if (requestHost) {
    try {
      return new URL(`http://${requestHost}`).hostname;
    } catch {
      // ignore malformed Host headers and fall back to the request URL
    }
  }

  try {
    return new URL(requestUrl).hostname;
  } catch {
    return null;
  }
}

/**
 * Validates a local-only development token against the current request.
 *
 * @param requestUrl - Full request URL
 * @param requestHost - Original Host header when available
 * @param providedToken - Token supplied by the caller
 * @param expectedToken - Token configured in the environment
 * @returns `true` when the token matches on a local hostname
 */
export function hasValidLocalDevToken(
  requestUrl: string,
  requestHost: string | undefined,
  providedToken: string | undefined,
  expectedToken: string | undefined,
): boolean {
  if (!providedToken || !expectedToken || providedToken !== expectedToken) {
    return false;
  }

  const hostname = getRequestHostname(requestUrl, requestHost);
  return hostname ? isLocalHostname(hostname) : false;
}

/**
 * Middleware that requires authentication.
 * Redirects to signin page if not authenticated.
 * Session-only — Bearer tokens are not accepted for dashboard pages.
 */
export function requireAuth(redirectTo = "/signin"): MiddlewareHandler<Env> {
  return async (c, next) => {
    const sitePathPrefix =
      c.var.appConfig?.sitePathPrefix ?? getSitePathPrefix(getSiteUrl(c.env));
    const redirectTarget = toPublicHref(redirectTo, sitePathPrefix);

    try {
      const session = await c.var.auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!session?.user) {
        return c.redirect(redirectTarget);
      }

      await next();
    } catch {
      return c.redirect(redirectTarget);
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

      // Dev shortcut: bypass DB lookup when DEV_API_TOKEN matches on a local hostname
      if (
        hasValidLocalDevToken(
          c.req.url,
          c.req.header("host"),
          rawToken,
          getDevApiToken(c.env),
        )
      ) {
        await next();
        return;
      }

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
