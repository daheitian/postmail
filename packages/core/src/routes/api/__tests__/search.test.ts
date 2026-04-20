import { describe, it, expect } from "vitest";
import { createTestApp } from "../../../__tests__/helpers/app.js";
import { searchApiRoutes } from "../search.js";

/** Wraps plain text in a minimal valid TipTap JSON document. */
function tiptapDoc(text: string): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  });
}

describe("Search API Routes", () => {
  it("returns 400 when query is missing", async () => {
    const { app } = createTestApp({ fts: true });
    app.route("/api/search", searchApiRoutes);

    const res = await app.request("/api/search");
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("'q' is required");
  });

  it("returns 400 for empty query", async () => {
    const { app } = createTestApp({ fts: true });
    app.route("/api/search", searchApiRoutes);

    const res = await app.request("/api/search?q=");
    expect(res.status).toBe(400);
  });

  it("returns 400 for query over 200 characters", async () => {
    const { app } = createTestApp({ fts: true });
    app.route("/api/search", searchApiRoutes);

    const longQuery = "a".repeat(201);
    const res = await app.request(`/api/search?q=${longQuery}`);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("Query too long");
  });

  it("returns search results for valid query", async () => {
    const { app, services } = createTestApp({ fts: true });
    app.route("/api/search", searchApiRoutes);

    await services.posts.create({
      format: "note",
      body: tiptapDoc("Testing search functionality in jant"),
    });

    const res = await app.request("/api/search?q=jant");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.query).toBe("jant");
    expect(body.results.length).toBeGreaterThanOrEqual(1);
    expect(body.count).toBeGreaterThanOrEqual(1);
    expect(body.results[0].permalink).toMatch(/^\/[a-z0-9]/);
  });

  it("returns quote attribution as sourceName/sourceUrl", async () => {
    const { app, services } = createTestApp({ fts: true });
    app.route("/api/search", searchApiRoutes);

    await services.posts.create({
      format: "quote",
      title: "Marcus Aurelius",
      url: "https://example.com/meditations",
      quoteText: "What stands in the way becomes the way.",
    });

    const res = await app.request("/api/search?q=Marcus");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].format).toBe("quote");
    expect(body.results[0].sourceName).toBe("Marcus Aurelius");
    expect(body.results[0].sourceUrl).toBe("https://example.com/meditations");
    expect(body.results[0].permalink).toMatch(/^\/[a-z0-9]/);
    expect(body.results[0]).not.toHaveProperty("title");
    expect(body.results[0]).not.toHaveProperty("url");
  });

  it("returns empty results for non-matching query", async () => {
    const { app } = createTestApp({ fts: true });
    app.route("/api/search", searchApiRoutes);

    const res = await app.request("/api/search?q=zznonexistentzzz");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.results).toEqual([]);
    expect(body.count).toBe(0);
  });

  it("does not require authentication", async () => {
    const { app } = createTestApp({ authenticated: false, fts: true });
    app.route("/api/search", searchApiRoutes);

    const res = await app.request("/api/search?q=test");
    // Should not return 401
    expect(res.status).not.toBe(401);
  });

  it("rate-limits repeated requests from the same IP", async () => {
    // Test app uses in-memory defaults (30/min). Send 31 requests from
    // the same spoofed IP and confirm the tail gets a 429 with Retry-After.
    const { app } = createTestApp({ fts: true });
    app.route("/api/search", searchApiRoutes);

    const headers = { "cf-connecting-ip": "203.0.113.7" };
    let ok = 0;
    let throttled = 0;
    let lastRetryAfter: string | null = null;

    for (let i = 0; i < 31; i++) {
      const res = await app.request("/api/search?q=hi", { headers });
      if (res.status === 429) {
        throttled += 1;
        lastRetryAfter = res.headers.get("retry-after");
      } else if (res.status === 200) {
        ok += 1;
      }
    }

    expect(ok).toBe(30);
    expect(throttled).toBe(1);
    expect(Number(lastRetryAfter)).toBeGreaterThan(0);
  });

  it("does not rate-limit when appConfig.rateLimit.disabled is true", async () => {
    const { app } = createTestApp({ fts: true });

    // Flip the disabled flag after the test-app middleware seeds
    // appConfig, but before the search route runs. Middleware order:
    // createTestApp's global use → this override → search route.
    app.use("/api/search/*", async (c, next) => {
      c.set("appConfig", {
        ...c.var.appConfig,
        rateLimit: { ...c.var.appConfig.rateLimit, disabled: true },
      });
      await next();
    });
    app.route("/api/search", searchApiRoutes);

    const headers = { "cf-connecting-ip": "203.0.113.8" };
    for (let i = 0; i < 40; i++) {
      const res = await app.request("/api/search?q=hi", { headers });
      expect(res.status).not.toBe(429);
    }
  });
});
