/**
 * Security Headers Middleware
 *
 * Adds a small set of explicit security headers. Public pages are allowed to
 * be embedded in iframes and to load third-party scripts/iframes (so YouTube,
 * Letterbird, analytics widgets, etc. work out of the box). Authoring, auth,
 * and API routes keep clickjacking protection and a tight CSP.
 *
 * The CSP itself is built by `lib/csp-builder.ts` so it's unit-testable.
 */

import { secureHeaders } from "hono/secure-headers";
import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { getConfiguredStorageDriver, getEnvString } from "../lib/env.js";
import { IS_VITE_DEV } from "../lib/version.js";
import {
  buildCspDirectives,
  type ContentSecurityPolicyDirectives,
} from "../lib/csp-builder.js";

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

function tryGetOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getDirectUploadConnectSources(env: Bindings): string[] {
  if (getConfiguredStorageDriver(env) !== "s3") return [];

  const sources: string[] = [];
  const endpoint = getEnvString(env, "S3_ENDPOINT");
  const bucket = getEnvString(env, "S3_BUCKET");
  const endpointOrigin = tryGetOrigin(endpoint);
  if (endpointOrigin) sources.push(endpointOrigin);

  if (!endpoint || !bucket) return sources;

  try {
    const parsed = new URL(endpoint);
    const hostname = parsed.hostname;
    if (
      hostname.includes("amazonaws.com") &&
      !hostname.startsWith(`${bucket}.`)
    ) {
      sources.push(`${parsed.protocol}//${bucket}.${parsed.host}`);
    }
  } catch {
    // Ignore invalid endpoints.
  }

  return sources;
}

function toHonoCspOptions(
  directives: ContentSecurityPolicyDirectives,
): ContentSecurityPolicyOptions {
  // Hono's `secureHeaders` accepts the same shape we produce, but with optional
  // arrays. Passing the typed directives directly keeps the contract honest.
  const result: ContentSecurityPolicyOptions = {
    defaultSrc: directives.defaultSrc,
    scriptSrc: directives.scriptSrc,
    styleSrc: directives.styleSrc,
    imgSrc: directives.imgSrc,
    mediaSrc: directives.mediaSrc,
    fontSrc: directives.fontSrc,
    connectSrc: directives.connectSrc,
    objectSrc: directives.objectSrc,
    baseUri: directives.baseUri,
    formAction: directives.formAction,
  };
  if (directives.frameSrc) result.frameSrc = directives.frameSrc;
  if (directives.frameAncestors)
    result.frameAncestors = directives.frameAncestors;
  return result;
}

function buildSecureHeadersOptions(
  path: string,
  env: Bindings,
): SecureHeadersOptions {
  const directives = buildCspDirectives({
    path,
    isFrameProtected: shouldBlockFraming(path),
    assetOrigin: tryGetOrigin(getEnvString(env, "ASSET_BASE_URL")),
    uploadConnectSources: getDirectUploadConnectSources(env),
    isDev: IS_VITE_DEV,
  });

  return {
    contentSecurityPolicy: toHonoCspOptions(directives),
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
