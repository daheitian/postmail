/**
 * In-Memory Rate Limiter
 *
 * Used by the Node runtime. The server process is long-lived and
 * single-instance, so a local `Map` is reliable and avoids unnecessary DB
 * round-trips. Uses the classic sliding-window-counter algorithm (two
 * aligned buckets with a weighted estimate) for smooth limiting without
 * the 2x boundary burst of a fixed window.
 *
 * On Cloudflare Workers use `createD1RateLimiter` instead — isolates are
 * ephemeral and cannot share memory across requests.
 */

import type {
  RateLimitCheckOptions,
  RateLimitResult,
  RateLimiter,
} from "./rate-limit.js";

interface Bucket {
  /** Unix seconds, aligned to the start of the current window. */
  windowStart: number;
  /** Hits recorded in the current window. */
  count: number;
  /** Hits recorded in the previous window (used for weighted estimate). */
  prevCount: number;
}

/**
 * Number of live keys after which we prune old buckets on the next write.
 * Keeps the Map bounded under abuse without paying for eager sweeps.
 */
const SWEEP_THRESHOLD = 10_000;

/**
 * Creates an isolated in-memory limiter. Tests construct one per test app;
 * the Node runtime holds a single module-level instance across requests.
 *
 * `now` is injectable so tests can assert window-rollover behavior without
 * relying on real time.
 */
export function createMemoryRateLimiter(
  now: () => number = () => Math.floor(Date.now() / 1000),
): RateLimiter {
  const buckets = new Map<string, Bucket>();

  function sweep(nowSec: number) {
    if (buckets.size < SWEEP_THRESHOLD) return;
    // Drop entries whose window is older than 2 windows in the past. We
    // use the bucket's stored windowSize via the difference between prev
    // hits existing and the current time; since the sweep runs rarely we
    // simply drop anything with windowStart < nowSec - 2 * largestWindow.
    // In practice callers use a single window size; we approximate by
    // dropping anything more than 10 minutes stale, which is generous.
    const cutoff = nowSec - 600;
    for (const [key, bucket] of buckets) {
      if (bucket.windowStart < cutoff) buckets.delete(key);
    }
  }

  return {
    async check(
      key: string,
      opts: RateLimitCheckOptions,
    ): Promise<RateLimitResult> {
      const { limit, windowSec } = opts;
      const nowSec = now();
      const currentWindow = Math.floor(nowSec / windowSec) * windowSec;

      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { windowStart: currentWindow, count: 0, prevCount: 0 };
        buckets.set(key, bucket);
      } else if (bucket.windowStart !== currentWindow) {
        // Roll forward: if exactly one window ago, preserve prev count for
        // the weighted estimate; otherwise treat the gap as cold-start.
        if (bucket.windowStart === currentWindow - windowSec) {
          bucket.prevCount = bucket.count;
        } else {
          bucket.prevCount = 0;
        }
        bucket.count = 0;
        bucket.windowStart = currentWindow;
      }

      const elapsed = nowSec - currentWindow;
      const prevWeight = 1 - elapsed / windowSec;
      const estimate = bucket.prevCount * prevWeight + bucket.count;

      if (estimate >= limit) {
        // Suggest waiting until the current window ends. This is
        // deliberately coarse; a more precise retry-after would require
        // computing when the weighted estimate drops back under the
        // limit, which is more complexity than this DoS-mitigation
        // feature warrants.
        const retryAfterSec = Math.max(1, windowSec - elapsed);
        return { ok: false, retryAfterSec };
      }

      bucket.count += 1;
      sweep(nowSec);
      return { ok: true };
    },
  };
}
