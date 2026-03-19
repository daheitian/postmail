import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";

vi.mock("../../lib/version.js", () => ({
  IS_VITE_DEV: false,
}));

const { secureHeadersMiddleware } = await import("../secure-headers.js");

type Env = { Bindings: Bindings; Variables: AppVariables };

describe("secureHeadersMiddleware", () => {
  it("allows broad image and media sources in CSP", async () => {
    const app = new Hono<Env>();

    app.use("*", async (_c, next) => {
      await next();
    });
    app.use("*", secureHeadersMiddleware());
    app.get("/", (c) => c.text("ok"));

    const response = await app.request("/");
    const csp = response.headers.get("content-security-policy");

    expect(csp).toContain("img-src 'self' data: blob: https: http:");
    expect(csp).toContain("media-src 'self' data: blob: https: http:");
  });

  it("keeps public pages embeddable with a smaller header set", async () => {
    const app = new Hono<Env>();

    app.use("*", async (_c, next) => {
      await next();
    });
    app.use("*", secureHeadersMiddleware());
    app.get("/", (c) => c.text("ok"));

    const response = await app.request("/");
    const csp = response.headers.get("content-security-policy");

    expect(response.headers.get("x-frame-options")).toBeNull();
    expect(response.headers.get("cross-origin-opener-policy")).toBeNull();
    expect(response.headers.get("cross-origin-resource-policy")).toBeNull();
    expect(response.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(csp).not.toContain("frame-ancestors");
    expect(csp).not.toContain("frame-src");
  });

  it("blocks protected pages from being embedded in iframes", async () => {
    const app = new Hono<Env>();

    app.use("*", async (_c, next) => {
      await next();
    });
    app.use("*", secureHeadersMiddleware());
    app.get("/settings", (c) => c.text("ok"));

    const response = await app.request("/settings");
    const csp = response.headers.get("content-security-policy");

    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
