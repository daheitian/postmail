import { describe, it, expect } from "vitest";
import { createMemoryRateLimiter } from "../rate-limit-memory.js";

describe("createMemoryRateLimiter", () => {
  it("allows requests under the limit", async () => {
    const limiter = createMemoryRateLimiter(() => 1_000);
    for (let i = 0; i < 3; i++) {
      const result = await limiter.check("k", { limit: 3, windowSec: 60 });
      expect(result.ok).toBe(true);
    }
  });

  it("rejects requests at or over the limit", async () => {
    const limiter = createMemoryRateLimiter(() => 1_000);
    await limiter.check("k", { limit: 2, windowSec: 60 });
    await limiter.check("k", { limit: 2, windowSec: 60 });
    const blocked = await limiter.check("k", { limit: 2, windowSec: 60 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("keeps keys independent", async () => {
    const limiter = createMemoryRateLimiter(() => 1_000);
    await limiter.check("a", { limit: 1, windowSec: 60 });
    // "a" is now at limit, but "b" should still pass.
    const b = await limiter.check("b", { limit: 1, windowSec: 60 });
    expect(b.ok).toBe(true);
  });

  it("releases capacity after the window rolls over", async () => {
    let now = 1_000;
    const limiter = createMemoryRateLimiter(() => now);

    // Fill the current window.
    await limiter.check("k", { limit: 1, windowSec: 60 });
    const blocked = await limiter.check("k", { limit: 1, windowSec: 60 });
    expect(blocked.ok).toBe(false);

    // Jump two full windows into the future — previous window carries no
    // weight, so capacity fully resets.
    now += 60 * 2;
    const released = await limiter.check("k", { limit: 1, windowSec: 60 });
    expect(released.ok).toBe(true);
  });

  it("applies previous-window weighting across a boundary", async () => {
    // Start aligned to a window boundary so window math is exact.
    // limit=10, windowSec=60. Fill the first window to the limit, then
    // step to the start of the next window. At t=0 into the new window,
    // the prev-window weight is 1.0, so the sliding estimate equals the
    // prev count (10) and the next request should still be rejected.
    let now = 960;
    const limiter = createMemoryRateLimiter(() => now);
    for (let i = 0; i < 10; i++) {
      const r = await limiter.check("k", { limit: 10, windowSec: 60 });
      expect(r.ok).toBe(true);
    }

    now = 960 + 60; // exact start of the next window
    const justAfter = await limiter.check("k", { limit: 10, windowSec: 60 });
    expect(justAfter.ok).toBe(false);

    // Well into the next window the prev-window weight decays; capacity
    // should become available again.
    now = 960 + 60 + 59; // 59s into the new window, weight ≈ 1/60
    const released = await limiter.check("k", { limit: 10, windowSec: 60 });
    expect(released.ok).toBe(true);
  });
});
