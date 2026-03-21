import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import type { Bindings } from "../../../types.js";
import type { AppVariables } from "../../../types/app-context.js";
import { DEFAULT_APP_PORT } from "../../../lib/env.js";
import { resolveConfig } from "../../../lib/resolve-config.js";
import { sitemapRoutes } from "../sitemap.js";

type Env = { Bindings: Bindings; Variables: AppVariables };
const TEST_SITE_URL = `http://localhost:${DEFAULT_APP_PORT}`;

function createSitemapTestApp(
  allSettings: Record<string, string> = {},
  envOverrides: Partial<Bindings> = {},
) {
  const app = new Hono<Env>();

  app.use("*", async (c, next) => {
    const env = {
      SITE_URL: TEST_SITE_URL,
      ...envOverrides,
    } as Bindings;
    c.env = env;
    c.set("appConfig", resolveConfig(env, allSettings));
    await next();
  });

  app.route("/", sitemapRoutes);

  return app;
}

describe("Sitemap Routes", () => {
  describe("/robots.txt", () => {
    it("disallows internal utility routes while allowing the public site", async () => {
      const app = createSitemapTestApp();

      const res = await app.request("/robots.txt");

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");

      const robots = await res.text();
      expect(robots).toContain("User-agent: *");
      expect(robots).toContain("Allow: /");
      expect(robots).toContain("Disallow: /_/");
      expect(robots).toContain(`Sitemap: ${TEST_SITE_URL}/sitemap.xml`);
    });

    it("disallows the entire site when global noindex is enabled", async () => {
      const app = createSitemapTestApp({ NOINDEX: "true" });

      const res = await app.request("/robots.txt");

      expect(res.status).toBe(200);

      const robots = await res.text();
      expect(robots).toContain("Disallow: /");
      expect(robots).not.toContain("Allow: /");
      expect(robots).not.toContain("Disallow: /_/");
    });
  });
});
