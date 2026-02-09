import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { requireOnboarding, resetOnboardingCache } from "../onboarding.js";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

function createMockServices(complete: boolean) {
  let callCount = 0;
  const services = {
    settings: {
      isOnboardingComplete: async () => {
        callCount++;
        return complete;
      },
    },
  } as AppVariables["services"];
  return { services, getCallCount: () => callCount };
}

function createApp(complete: boolean) {
  const mock = createMockServices(complete);
  const app = new Hono<Env>();

  app.use("*", async (c, next) => {
    c.set("services", mock.services);
    await next();
  });
  app.use("*", requireOnboarding());

  // Register routes for testing
  app.get("/", (c) => c.text("Home"));
  app.get("/dash", (c) => c.text("Dashboard"));
  app.get("/archive", (c) => c.text("Archive"));
  app.get("/p/abc", (c) => c.text("Post"));
  app.get("/setup", (c) => c.text("Setup"));
  app.get("/health", (c) => c.text("OK"));
  app.get("/signin", (c) => c.text("Signin"));
  app.get("/signout", (c) => c.text("Signout"));
  app.get("/reset", (c) => c.text("Reset"));
  app.get("/api/auth/session", (c) => c.json({ ok: true }));

  return { app, getCallCount: mock.getCallCount };
}

describe("requireOnboarding", () => {
  beforeEach(() => {
    resetOnboardingCache();
  });

  it("redirects to /setup when onboarding not complete", async () => {
    const { app } = createApp(false);
    const res = await app.request("/", { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/setup");
  });

  it("redirects /dash to /setup when onboarding not complete", async () => {
    const { app } = createApp(false);
    const res = await app.request("/dash", { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/setup");
  });

  it("redirects /archive to /setup when onboarding not complete", async () => {
    const { app } = createApp(false);
    const res = await app.request("/archive", { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/setup");
  });

  it("allows through when onboarding is complete", async () => {
    const { app } = createApp(true);
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Home");
  });

  it("caches result — second request skips DB query", async () => {
    const { app, getCallCount } = createApp(true);

    await app.request("/");
    expect(getCallCount()).toBe(1);

    await app.request("/dash");
    expect(getCallCount()).toBe(1); // still 1 — cached
  });

  it("does not cache incomplete status", async () => {
    const { app, getCallCount } = createApp(false);

    await app.request("/", { redirect: "manual" });
    expect(getCallCount()).toBe(1);

    await app.request("/dash", { redirect: "manual" });
    expect(getCallCount()).toBe(2); // queried again
  });

  describe("bypass paths", () => {
    it("allows /setup without checking DB", async () => {
      const { app, getCallCount } = createApp(false);
      const res = await app.request("/setup");
      expect(res.status).toBe(200);
      expect(getCallCount()).toBe(0);
    });

    it("allows /health without checking DB", async () => {
      const { app, getCallCount } = createApp(false);
      const res = await app.request("/health");
      expect(res.status).toBe(200);
      expect(getCallCount()).toBe(0);
    });

    it("allows /signin without checking DB", async () => {
      const { app, getCallCount } = createApp(false);
      const res = await app.request("/signin");
      expect(res.status).toBe(200);
      expect(getCallCount()).toBe(0);
    });

    it("allows /signout without checking DB", async () => {
      const { app, getCallCount } = createApp(false);
      const res = await app.request("/signout");
      expect(res.status).toBe(200);
      expect(getCallCount()).toBe(0);
    });

    it("allows /reset without checking DB", async () => {
      const { app, getCallCount } = createApp(false);
      const res = await app.request("/reset");
      expect(res.status).toBe(200);
      expect(getCallCount()).toBe(0);
    });

    it("allows /api/auth/* without checking DB", async () => {
      const { app, getCallCount } = createApp(false);
      const res = await app.request("/api/auth/session");
      expect(res.status).toBe(200);
      expect(getCallCount()).toBe(0);
    });
  });
});
