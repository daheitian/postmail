/**
 * D1 Sliding-Window Rate Limiter
 *
 * Used by the Cloudflare Workers runtime where isolates are ephemeral and
 * memory-based limiters would silently drop state between requests. Each
 * check performs one SELECT (over a two-row range) plus one UPSERT — both
 * hit a composite primary key so the round-trips are cheap.
 *
 * Algorithm: two-window weighted counter. The previous window's tally
 * decays linearly as the current window fills, giving a smoother limit
 * than a naive fixed window (which would allow a 2x burst at the
 * boundary) while remaining a single-key storage primitive.
 *
 * For Node deployments use `createMemoryRateLimiter` instead.
 */

import { and, eq, inArray, lt, sql } from "drizzle-orm";
import type { Database } from "../db/index.js";
import type { DatabaseSchema } from "../db/schema-bundle.js";
import type {
  RateLimitCheckOptions,
  RateLimitResult,
  RateLimiter,
} from "./rate-limit.js";

/**
 * Probability of running opportunistic cleanup on any given write.
 * 1% strikes a balance between bounded table growth and per-request cost.
 */
const CLEANUP_PROBABILITY = 0.01;

export function createD1RateLimiter(
  db: Database,
  schema: DatabaseSchema,
  now: () => number = () => Math.floor(Date.now() / 1000),
): RateLimiter {
  const { rateLimit } = schema;

  return {
    async check(
      key: string,
      opts: RateLimitCheckOptions,
    ): Promise<RateLimitResult> {
      const { limit, windowSec } = opts;
      const nowSec = now();
      const currentWindow = Math.floor(nowSec / windowSec) * windowSec;
      const previousWindow = currentWindow - windowSec;

      const rows = await db
        .select({
          windowStart: rateLimit.windowStart,
          count: rateLimit.count,
        })
        .from(rateLimit)
        .where(
          and(
            eq(rateLimit.key, key),
            inArray(rateLimit.windowStart, [currentWindow, previousWindow]),
          ),
        );

      let currentCount = 0;
      let previousCount = 0;
      for (const row of rows) {
        if (row.windowStart === currentWindow) currentCount = row.count;
        else if (row.windowStart === previousWindow) previousCount = row.count;
      }

      const elapsed = nowSec - currentWindow;
      const prevWeight = 1 - elapsed / windowSec;
      const estimate = previousCount * prevWeight + currentCount;

      if (estimate >= limit) {
        // Don't record the rejected hit — otherwise a sustained flood
        // would keep increasing `count` past the limit for no benefit.
        const retryAfterSec = Math.max(1, windowSec - elapsed);
        return { ok: false, retryAfterSec };
      }

      await db
        .insert(rateLimit)
        .values({ key, windowStart: currentWindow, count: 1 })
        .onConflictDoUpdate({
          target: [rateLimit.key, rateLimit.windowStart],
          set: { count: sql`${rateLimit.count} + 1` },
        });

      // Opportunistic cleanup: keep the table bounded without writing
      // a DELETE on every request.
      if (Math.random() < CLEANUP_PROBABILITY) {
        await db
          .delete(rateLimit)
          .where(lt(rateLimit.windowStart, currentWindow - windowSec * 2));
      }

      return { ok: true };
    },
  };
}
