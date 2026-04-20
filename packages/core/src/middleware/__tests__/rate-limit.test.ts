import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { rateLimit } from "../rate-limit.js";
import type { RateLimiter } from "../../lib/rate-limit.js";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

/**
 * Build a tiny Hono app that seeds just the slice of `c.var` the
 * rate-limit middleware reads — keeps the blast radius of each test
 * minimal and independent of the full `createTestApp` fixture.
 */
function buildApp(options: {
  limiter: RateLimiter;
  disabled?: boolean;
}): Hono<Env> {
  const app = new Hono<Env>();
  app.use("*", async (c, next) => {
    c.set("rateLimiter", options.limiter);
    c.set("appConfig", {
      rateLimit: {
        disabled: options.disabled ?? false,
        searchPerMinute: 30,
      },
    } as AppVariables["appConfig"]);
    await next();
  });
  app.use("*", rateLimit({ name: "test", limit: 2, windowSec: 60 }));
  app.get("/", (c) => c.text("ok"));
  return app;
}

/** Fake limiter that lets us script results without real timing. */
function scriptedLimiter(
  outcomes: Array<{ ok: boolean; retryAfterSec?: number }>,
) {
  const keys: string[] = [];
  let i = 0;
  const limiter: RateLimiter = {
    async check(key) {
      keys.push(key);
      const out = outcomes[i++] ?? { ok: true };
      return out;
    },
  };
  return { limiter, keys: () => keys };
}

describe("rateLimit middleware", () => {
  it("passes the request through when under limit", async () => {
    const { limiter } = scriptedLimiter([{ ok: true }]);
    const app = buildApp({ limiter });

    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  it("responds 429 with Retry-After when the limiter rejects", async () => {
    const { limiter } = scriptedLimiter([{ ok: false, retryAfterSec: 42 }]);
    const app = buildApp({ limiter });

    const res = await app.request("/");
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("42");
    expect(await res.json()).toEqual({
      error: "Too many requests. Please slow down.",
    });
  });

  it("falls back to the window size when retryAfterSec is missing", async () => {
    const { limiter } = scriptedLimiter([{ ok: false }]);
    const app = buildApp({ limiter });

    const res = await app.request("/");
    expect(res.headers.get("retry-after")).toBe("60");
  });

  it("short-circuits when rateLimit.disabled is true", async () => {
    const { limiter, keys } = scriptedLimiter([{ ok: false }]);
    const app = buildApp({ limiter, disabled: true });

    const res = await app.request("/");
    expect(res.status).toBe(200);
    // Limiter should not have been consulted at all when disabled.
    expect(keys()).toEqual([]);
  });

  it("prefers cf-connecting-ip over x-forwarded-for for the bucket key", async () => {
    const { limiter, keys } = scriptedLimiter([{ ok: true }]);
    const app = buildApp({ limiter });

    await app.request("/", {
      headers: {
        "cf-connecting-ip": "1.2.3.4",
        "x-forwarded-for": "5.6.7.8",
      },
    });
    expect(keys()).toEqual(["test:1.2.3.4"]);
  });

  it("falls back to x-forwarded-for (first entry) when cf header is absent", async () => {
    const { limiter, keys } = scriptedLimiter([{ ok: true }]);
    const app = buildApp({ limiter });

    await app.request("/", {
      headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" },
    });
    expect(keys()).toEqual(["test:10.0.0.1"]);
  });
});
