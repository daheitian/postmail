import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { i18nMiddleware } from "../middleware.js";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

function createApp(allSettings: Record<string, string>) {
  const app = new Hono<Env>();

  app.use("*", async (c, next) => {
    c.set("allSettings", allSettings);
    await next();
  });
  app.use("*", i18nMiddleware());
  app.get("/", (c) => c.text(c.get("lang")));

  return app;
}

describe("i18nMiddleware", () => {
  it("always returns en as the locale", async () => {
    const app = createApp({ ONBOARDING_STATUS: "pending" });
    const res = await app.request("/", {
      headers: { "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
    });

    expect(await res.text()).toBe("en");
  });

  it("returns en after onboarding is complete", async () => {
    const app = createApp({
      ONBOARDING_STATUS: "completed",
      SITE_LANGUAGE: "en",
    });
    const res = await app.request("/", {
      headers: { "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
    });

    expect(await res.text()).toBe("en");
  });

  it("falls back to en when SITE_LANGUAGE is missing", async () => {
    const app = createApp({ ONBOARDING_STATUS: "completed" });
    const res = await app.request("/");

    expect(await res.text()).toBe("en");
  });
});
