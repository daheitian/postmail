import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { defaultCacheControl } from "../cache-control.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

function buildApp(): Hono<Env> {
  const app = new Hono<Env>();
  app.use("*", defaultCacheControl());

  // Un-annotated dynamic page — the common case.
  app.get("/", (c) => c.html("<h1>home</h1>"));

  // Route that declares its own public cache policy (e.g. a feed).
  app.get("/feed", (c) =>
    c.body("<feed/>", 200, { "Cache-Control": "public, max-age=180" }),
  );

  // Route that already opts out explicitly.
  app.get("/api/thing", (c) =>
    c.json({ ok: true }, 200, { "Cache-Control": "no-store" }),
  );

  return app;
}

describe("defaultCacheControl", () => {
  it("defaults un-annotated responses to private, no-store", async () => {
    const response = await buildApp().request("/");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("leaves an explicit public cache policy untouched", async () => {
    const response = await buildApp().request("/feed");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=180");
  });

  it("leaves an explicit opt-out untouched", async () => {
    const response = await buildApp().request("/api/thing");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("defaults not-found responses too", async () => {
    const response = await buildApp().request("/missing");
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
