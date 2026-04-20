import { describe, it, expect } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { sqliteSchemaBundle } from "../../db/schema-bundle.js";
import type { Database } from "../../db/index.js";
import { createD1RateLimiter } from "../rate-limit-d1.js";

function createLimiter(now: () => number) {
  const testDb = createTestDatabase();
  const db = testDb.db as unknown as Database;
  return {
    limiter: createD1RateLimiter(db, sqliteSchemaBundle, now),
    db,
    sqlite: testDb.sqlite,
  };
}

describe("createD1RateLimiter", () => {
  it("allows requests under the limit", async () => {
    const { limiter } = createLimiter(() => 1_000);
    for (let i = 0; i < 3; i++) {
      const result = await limiter.check("k", { limit: 3, windowSec: 60 });
      expect(result.ok).toBe(true);
    }
  });

  it("rejects requests at or over the limit", async () => {
    const { limiter } = createLimiter(() => 1_000);
    await limiter.check("k", { limit: 2, windowSec: 60 });
    await limiter.check("k", { limit: 2, windowSec: 60 });
    const blocked = await limiter.check("k", { limit: 2, windowSec: 60 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("does not persist a row when a request is rejected", async () => {
    const { limiter, sqlite } = createLimiter(() => 1_000);
    await limiter.check("k", { limit: 1, windowSec: 60 });
    await limiter.check("k", { limit: 1, windowSec: 60 }); // rejected

    // Only one write should have happened — the first (allowed) one.
    const row = sqlite
      .prepare("SELECT count FROM rate_limit WHERE key = 'k'")
      .get() as { count: number };
    expect(row.count).toBe(1);
  });

  it("keeps keys independent", async () => {
    const { limiter } = createLimiter(() => 1_000);
    await limiter.check("a", { limit: 1, windowSec: 60 });
    const b = await limiter.check("b", { limit: 1, windowSec: 60 });
    expect(b.ok).toBe(true);
  });

  it("releases capacity after two full windows", async () => {
    let now = 960;
    const { limiter } = createLimiter(() => now);
    await limiter.check("k", { limit: 1, windowSec: 60 });
    const blocked = await limiter.check("k", { limit: 1, windowSec: 60 });
    expect(blocked.ok).toBe(false);

    now += 60 * 2;
    const released = await limiter.check("k", { limit: 1, windowSec: 60 });
    expect(released.ok).toBe(true);
  });

  it("applies previous-window weighting across a boundary", async () => {
    let now = 960;
    const { limiter } = createLimiter(() => now);
    for (let i = 0; i < 10; i++) {
      const r = await limiter.check("k", { limit: 10, windowSec: 60 });
      expect(r.ok).toBe(true);
    }

    now = 960 + 60; // t=0 into next window, prev weight = 1.0
    const justAfter = await limiter.check("k", { limit: 10, windowSec: 60 });
    expect(justAfter.ok).toBe(false);

    now = 960 + 60 + 59; // prev weight ≈ 1/60, estimate ≈ 0.167
    const released = await limiter.check("k", { limit: 10, windowSec: 60 });
    expect(released.ok).toBe(true);
  });
});
