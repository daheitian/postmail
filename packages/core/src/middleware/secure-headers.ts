/**
 * Security Headers Middleware
 *
 * Adds a small set of explicit security headers. Public pages are allowed to
 * be embedded in iframes, while authoring, auth, and API routes keep
 * clickjacking protection.
 */

import { secureHeaders } from "hono/secure-headers";
import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { IS_VITE_DEV } from "../lib/version.js";

type Env = { Bindings: Bindings; Variables: AppVariables };
type SecureHeadersOptions = NonNullable<Parameters<typeof secureHeaders>[0]>;
type ContentSecurityPolicyOptions = NonNullable<
  SecureHeadersOptions["contentSecurityPolicy"]
>;

const FRAME_PROTECTED_PATH_PREFIXES = [
  "/api",
  "/settings",
  "/compose",
  "/signin",
  "/signout",
  "/reset",
  "/setup",
  "/__dev",
] as const;

function matchesPathPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function shouldBlockFraming(path: string): boolean {
  return FRAME_PROTECTED_PATH_PREFIXES.some((prefix) =>
    matchesPathPrefix(path, prefix),
  );
}

function buildContentSecurityPolicy(
  path: string,
): ContentSecurityPolicyOptions {
  const contentSecurityPolicy: ContentSecurityPolicyOptions = {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      // Datastar evaluates expressions in data-on-* / data-signals attributes
      "'unsafe-eval'",
    ],
    styleSrc: [
      "'self'",
      // Theme styles and custom CSS are injected as inline <style> tags
      "'unsafe-inline'",
    ],
    imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
    mediaSrc: ["'self'", "data:", "blob:", "https:", "http:"],
    fontSrc: ["'self'"],
    connectSrc: IS_VITE_DEV ? ["'self'", "ws:"] : ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
  };

  if (shouldBlockFraming(path)) {
    contentSecurityPolicy.frameAncestors = ["'none'"];
  }

  return contentSecurityPolicy;
}

function buildSecureHeadersOptions(path: string): SecureHeadersOptions {
  return {
    contentSecurityPolicy: buildContentSecurityPolicy(path),
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
    referrerPolicy: "strict-origin-when-cross-origin",
    strictTransportSecurity: true,
    xContentTypeOptions: true,
    xDnsPrefetchControl: false,
    xDownloadOptions: false,
    xFrameOptions: shouldBlockFraming(path) ? "DENY" : false,
    xPermittedCrossDomainPolicies: false,
    xXssProtection: false,
  };
}

export function secureHeadersMiddleware(): MiddlewareHandler<Env> {
  return async (c, next) => {
    return secureHeaders(buildSecureHeadersOptions(c.req.path))(c, next);
  };
}
