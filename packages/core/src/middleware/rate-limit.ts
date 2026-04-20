/**
 * Rate-Limit Middleware
 *
 * Applies a per-IP rate limit to the routes it wraps. Which storage
 * backs the limiter (D1 or in-memory) is decided upstream by the
 * runtime; this middleware only reads `c.var.rateLimiter` and doesn't
 * care.
 *
 * When the limit is exceeded, responds with HTTP 429 and a
 * `Retry-After` header. When `appConfig.rateLimit.disabled` is true the
 * middleware short-circuits to `next()` so test and dev environments
 * don't have to reason about bucket state.
 */

import type { MiddlewareHandler } from "hono";
import { getClientIp } from "../lib/rate-limit.js";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export interface RateLimitMiddlewareOptions {
  /**
   * Storage-key prefix scoping this limit (e.g. "search"). Keeps
   * counters for different endpoints independent when they share a
   * storage backend.
   */
  name: string;
  /** Max requests per IP within `windowSec`. */
  limit: number;
  /** Sliding window size in seconds. */
  windowSec: number;
}

export function rateLimit(
  opts: RateLimitMiddlewareOptions,
): MiddlewareHandler<Env> {
  return async (c, next) => {
    if (c.var.appConfig.rateLimit.disabled) return next();

    const ip = getClientIp(c);
    const result = await c.var.rateLimiter.check(`${opts.name}:${ip}`, {
      limit: opts.limit,
      windowSec: opts.windowSec,
    });

    if (!result.ok) {
      c.header("Retry-After", String(result.retryAfterSec ?? opts.windowSec));
      return c.json({ error: "Too many requests. Please slow down." }, 429);
    }

    return next();
  };
}
