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
import { getConfiguredStorageDriver, getEnvString } from "../lib/env.js";
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

function appendUniqueSource(sources: string[], value: string | null): void {
  if (!value || sources.includes(value)) {
    return;
  }
  sources.push(value);
}

function tryGetOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getDirectUploadConnectSources(env: Bindings): string[] {
  const sources = IS_VITE_DEV ? ["'self'", "ws:"] : ["'self'"];
  if (getConfiguredStorageDriver(env) !== "s3") {
    return sources;
  }

  const endpoint = getEnvString(env, "S3_ENDPOINT");
  const bucket = getEnvString(env, "S3_BUCKET");
  appendUniqueSource(sources, tryGetOrigin(endpoint));

  if (!endpoint || !bucket) {
    return sources;
  }

  try {
    const parsed = new URL(endpoint);
    const hostname = parsed.hostname;
    if (
      hostname.includes("amazonaws.com") &&
      !hostname.startsWith(`${bucket}.`)
    ) {
      appendUniqueSource(
        sources,
        `${parsed.protocol}//${bucket}.${parsed.host}`,
      );
    }
  } catch {
    // Ignore invalid endpoints and keep the default connect-src.
  }

  return sources;
}

function buildContentSecurityPolicy(
  path: string,
  env: Bindings,
): ContentSecurityPolicyOptions {
  const assetOrigin = tryGetOrigin(getEnvString(env, "ASSET_BASE_URL"));

  const scriptSrc = [
    "'self'",
    // Datastar evaluates expressions in data-on-* / data-signals attributes
    "'unsafe-eval'",
  ];
  const styleSrc = [
    "'self'",
    // Theme styles and custom CSS are injected as inline <style> tags
    "'unsafe-inline'",
  ];
  const fontSrc = ["'self'"];
  appendUniqueSource(scriptSrc, assetOrigin);
  appendUniqueSource(styleSrc, assetOrigin);
  appendUniqueSource(fontSrc, assetOrigin);

  const contentSecurityPolicy: ContentSecurityPolicyOptions = {
    defaultSrc: ["'self'"],
    scriptSrc,
    styleSrc,
    imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
    mediaSrc: ["'self'", "data:", "blob:", "https:", "http:"],
    fontSrc,
    connectSrc: getDirectUploadConnectSources(env),
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
  };

  if (shouldBlockFraming(path)) {
    contentSecurityPolicy.frameAncestors = ["'none'"];
  }

  return contentSecurityPolicy;
}

function buildSecureHeadersOptions(
  path: string,
  env: Bindings,
): SecureHeadersOptions {
  return {
    contentSecurityPolicy: buildContentSecurityPolicy(path, env),
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
    return secureHeaders(buildSecureHeadersOptions(c.req.path, c.env))(c, next);
  };
}
