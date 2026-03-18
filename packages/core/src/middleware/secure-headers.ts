/**
 * Security Headers Middleware
 *
 * Adds Content-Security-Policy and other security headers via Hono's
 * built-in secureHeaders middleware. Uses a baseline CSP that works with
 * the current tech stack (Datastar, Lit, inline theme styles).
 */

import { secureHeaders } from "hono/secure-headers";
import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { getEnvString } from "../lib/env.js";
import { IS_VITE_DEV } from "../lib/version.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

function toOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Returns external media origins that should be allowed by CSP when media is
 * served from a dedicated public host instead of the app origin.
 *
 * @param env - Worker bindings used to resolve configured public media URLs
 * @returns Unique list of allowed media origins
 * @example
 * ```ts
 * getConfiguredMediaOrigins({ JANT_R2_PUBLIC_URL: "https://cdn.example.com" });
 * ```
 */
export function getConfiguredMediaOrigins(env: Bindings): string[] {
  const candidates = [
    getEnvString(env, "JANT_R2_PUBLIC_URL", "R2_PUBLIC_URL"),
    getEnvString(env, "JANT_S3_PUBLIC_URL", "S3_PUBLIC_URL"),
    getEnvString(env, "JANT_LOCAL_PUBLIC_URL", "LOCAL_PUBLIC_URL"),
  ];

  return [
    ...new Set(
      candidates.map(toOrigin).filter((url): url is string => url !== null),
    ),
  ];
}

export function secureHeadersMiddleware(): MiddlewareHandler<Env> {
  return async (c, next) => {
    const mediaOrigins = getConfiguredMediaOrigins(c.env);

    return secureHeaders({
      contentSecurityPolicy: {
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
        mediaSrc: ["'self'", "blob:", "https:", "http:", ...mediaOrigins],
        fontSrc: ["'self'"],
        connectSrc: IS_VITE_DEV ? ["'self'", "ws:"] : ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    })(c, next);
  };
}
