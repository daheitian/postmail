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
  // Returns `${lang}|${i18n.locale}` so tests can assert both independently.
  app.get("*", (c) => c.text(`${c.get("lang")}|${c.get("i18n").locale}`));

  return app;
}

describe("i18nMiddleware", () => {
  it("sets html lang to SITE_LANGUAGE but renders public UI in en", async () => {
    const app = createApp({
      ONBOARDING_STATUS: "completed",
      SITE_LANGUAGE: "zh-Hans",
    });
    const res = await app.request("/", {
      headers: { "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
    });

    // `lang` reflects content language (posts), i18n is en on public routes.
    expect(await res.text()).toBe("zh-Hans|en");
  });

  it("activates SITE_LANGUAGE on /settings routes", async () => {
    const app = createApp({
      ONBOARDING_STATUS: "completed",
      SITE_LANGUAGE: "zh-Hans",
    });
    const res = await app.request("/settings/general");

    expect(await res.text()).toBe("zh-Hans|zh-Hans");
  });

  it("activates SITE_LANGUAGE on /dash routes", async () => {
    const app = createApp({
      ONBOARDING_STATUS: "completed",
      SITE_LANGUAGE: "zh-Hans",
    });
    const res = await app.request("/dash");

    expect(await res.text()).toBe("zh-Hans|zh-Hans");
  });

  it("keeps public routes in en regardless of SITE_LANGUAGE", async () => {
    const app = createApp({
      ONBOARDING_STATUS: "completed",
      SITE_LANGUAGE: "zh-Hans",
    });
    const res = await app.request("/collections");

    expect(await res.text()).toBe("zh-Hans|en");
  });

  it("falls back to en on admin routes when SITE_LANGUAGE is missing", async () => {
    const app = createApp({ ONBOARDING_STATUS: "completed" });
    const res = await app.request("/settings");

    expect(await res.text()).toBe("en|en");
  });

  it("falls back to en on admin routes when SITE_LANGUAGE is unsupported", async () => {
    const app = createApp({
      ONBOARDING_STATUS: "completed",
      SITE_LANGUAGE: "fr",
    });
    const res = await app.request("/settings");

    expect(await res.text()).toBe("en|en");
  });
});
