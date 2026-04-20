/**
 * Rate Limiting Abstraction
 *
 * Shared interface for per-key rate limiting. Runtimes provide their own
 * implementation: Cloudflare Workers uses a D1-backed sliding-window table
 * (ephemeral isolates can't hold memory state), while Node uses an
 * in-process Map (the process is persistent and avoids DB round-trips).
 *
 * Consumers depend only on this interface; they are runtime-agnostic.
 */

import type { Context } from "hono";

export interface RateLimitCheckOptions {
  /** Max requests allowed within `windowSec`. */
  limit: number;
  /** Sliding window size in seconds. */
  windowSec: number;
}

export interface RateLimitResult {
  /** True when the request is under the limit (already counted). */
  ok: boolean;
  /**
   * When `ok` is false, suggested seconds the client should wait before
   * retrying. Implementations may return the full window as a safe default.
   */
  retryAfterSec?: number;
}

export interface RateLimiter {
  /**
   * Records a hit against `key` and reports whether the request is under
   * the configured limit. Implementations must be race-safe enough that
   * concurrent callers cannot durably exceed the limit.
   */
  check(key: string, opts: RateLimitCheckOptions): Promise<RateLimitResult>;
}

/**
 * Extracts the client IP from a Hono request context.
 *
 * On Cloudflare Workers, `cf-connecting-ip` is set by the edge and is
 * authoritative. On Node deployments we fall back to the leftmost
 * `x-forwarded-for` entry, which is the conventional client IP when the
 * app sits behind a single trusted proxy. When neither header is
 * available we return `"unknown"` so all such requests share a bucket —
 * preferable to skipping the rate limit entirely.
 *
 * Note: this helper does not verify proxy trust. It is used for DoS
 * protection, not authentication. If header-forgery resistance becomes
 * important, gate the `x-forwarded-for` branch on `shouldTrustProxy`.
 */
export function getClientIp(c: Context): string {
  const cf = c.req.header("cf-connecting-ip");
  if (cf) return cf;
  const fwd = c.req.header("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
