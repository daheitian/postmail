/**
 * Authentication Middleware
 *
 * Protects routes by requiring authentication via session cookies
 * or Bearer API tokens.
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { getDevApiToken, getInternalAdminToken } from "../lib/env.js";
import { NotFoundError, UnauthorizedError } from "../lib/errors.js";
import { getRuntimeSitePathPrefix } from "../lib/site-resolution.js";
import { toPublicHref } from "../lib/url.js";

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
    const sitePathPrefix = getRuntimeSitePathPrefix({
      env: c.env,
      appConfig: c.var.appConfig,
      currentSiteDomain: c.var.currentSiteDomain,
    });
    const redirectTarget = toPublicHref(redirectTo, sitePathPrefix);

    try {
      const session = await c.var.auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!session?.user) {
        return c.redirect(redirectTarget);
      }

      const membership = await c.var.services.siteMembers.get(
        c.var.currentSite.id,
        session.user.id,
      );
      if (!membership) {
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
        const membership = await c.var.services.siteMembers.get(
          c.var.currentSite.id,
          session.user.id,
        );
        if (!membership) {
          throw new UnauthorizedError();
        }

        await next();
        return;
      }
    } catch {
      // Session check failed — fall through to Bearer token
    }

    // 2. Try Bearer token auth
    if (await hasValidBearerApiToken(c)) {
      await next();
      return;
    }

    throw new UnauthorizedError();
  };
}

/**
 * Middleware for internal maintenance APIs.
 * Only accepts the environment-provided internal admin token.
 */
export function requireInternalAdminApi(): MiddlewareHandler<Env> {
  return async (c, next) => {
    const expectedToken = getInternalAdminToken(c.env);
    if (!expectedToken) {
      throw new NotFoundError("Internal admin endpoint");
    }

    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError();
    }

    const providedToken = authHeader.slice(7);
    if (!timingSafeTokenEquals(providedToken, expectedToken)) {
      throw new UnauthorizedError();
    }

    await next();
  };
}

function timingSafeTokenEquals(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

async function hasValidBearerApiToken(c: {
  env: Bindings;
  executionCtx?: { waitUntil: (promise: Promise<unknown>) => void };
  req: {
    header: (name: string) => string | undefined;
    url: string;
  };
  var: {
    services: AppVariables["services"];
  };
}): Promise<boolean> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const rawToken = authHeader.slice(7);

  if (
    hasValidLocalDevToken(
      c.req.url,
      c.req.header("host"),
      rawToken,
      getDevApiToken(c.env),
    )
  ) {
    return true;
  }

  const tokenId = await c.var.services.apiTokens.verify(rawToken);
  if (!tokenId) {
    return false;
  }

  const updatePromise = c.var.services.apiTokens.updateLastUsed(tokenId);
  try {
    c.executionCtx?.waitUntil(updatePromise);
  } catch {
    // executionCtx not available (e.g. in tests) — ignore
  }

  return true;
}
