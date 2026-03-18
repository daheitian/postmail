import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";

vi.mock("../../lib/version.js", () => ({
  IS_VITE_DEV: false,
}));

const { getConfiguredMediaOrigins, secureHeadersMiddleware } =
  await import("../secure-headers.js");

type Env = { Bindings: Bindings; Variables: AppVariables };

function makeEnv(overrides: Record<string, string> = {}): Bindings {
  return overrides as unknown as Bindings;
}

describe("getConfiguredMediaOrigins", () => {
  it("returns unique origins for configured public media URLs", () => {
    const origins = getConfiguredMediaOrigins(
      makeEnv({
        JANT_R2_PUBLIC_URL: "https://demo-media.jant.me/media",
        JANT_S3_PUBLIC_URL: "https://demo-media.jant.me/other-path",
        JANT_LOCAL_PUBLIC_URL: "https://local-media.example.com/public",
      }),
    );

    expect(origins).toEqual([
      "https://demo-media.jant.me",
      "https://local-media.example.com",
    ]);
  });

  it("ignores invalid or empty URLs", () => {
    const origins = getConfiguredMediaOrigins(
      makeEnv({
        JANT_R2_PUBLIC_URL: "not-a-url",
        JANT_S3_PUBLIC_URL: "",
      }),
    );

    expect(origins).toEqual([]);
  });
});

describe("secureHeadersMiddleware", () => {
  it("allows external http/https media and configured media origins in CSP", async () => {
    const app = new Hono<Env>();

    app.use("*", async (c, next) => {
      c.env = makeEnv({
        JANT_R2_PUBLIC_URL: "https://demo-media.jant.me/media",
      });
      await next();
    });
    app.use("*", secureHeadersMiddleware());
    app.get("/", (c) => c.text("ok"));

    const response = await app.request("/");
    const csp = response.headers.get("content-security-policy");

    expect(csp).toContain("media-src 'self' blob: https: http:");
    expect(csp).toContain("https://demo-media.jant.me");
  });

  it("allows http image sources in CSP", async () => {
    const app = new Hono<Env>();

    app.use("*", async (_c, next) => {
      await next();
    });
    app.use("*", secureHeadersMiddleware());
    app.get("/", (c) => c.text("ok"));

    const response = await app.request("/");
    const csp = response.headers.get("content-security-policy");

    expect(csp).toContain("img-src 'self' data: blob: https: http:");
  });
});
