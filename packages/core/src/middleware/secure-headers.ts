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
import { IS_VITE_DEV } from "../lib/version.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export function secureHeadersMiddleware(): MiddlewareHandler<Env> {
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
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      mediaSrc: ["'self'", "blob:"],
      fontSrc: ["'self'"],
      connectSrc: IS_VITE_DEV ? ["'self'", "ws:"] : ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  });
}
