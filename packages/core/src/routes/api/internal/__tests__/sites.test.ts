import { describe, expect, it } from "vitest";
import { createTestApp } from "../../../../__tests__/helpers/app.js";
import { internalSitesRoutes } from "../sites.js";

describe("Internal site admin routes", () => {
  it("returns 404 when the internal admin token is not configured", async () => {
    const { app } = createTestApp({ authenticated: false });
    app.route("/api/internal/sites", internalSitesRoutes);

    const res = await app.request("/api/internal/sites", {
      method: "POST",
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      error: "Internal admin endpoint not found",
      code: "NOT_FOUND",
    });
  });

  it("rejects site provisioning in single-site mode", async () => {
    const { app } = createTestApp({
      authenticated: false,
      internalAdminToken: "internal-secret",
      siteResolutionMode: "single-site",
    });
    app.route("/api/internal/sites", internalSitesRoutes);

    const res = await app.request("/api/internal/sites", {
      method: "POST",
      headers: {
        Authorization: "Bearer internal-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: "demo-cloud",
        primaryHost: "demo-cloud.example.com",
        siteName: "Demo Cloud",
      }),
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Site provisioning is only available in host-based mode.",
      code: "CONFLICT",
    });
  });

  it("creates a managed site in host-based mode", async () => {
    const { app, sqlite } = createTestApp({
      authenticated: false,
      internalAdminToken: "internal-secret",
      siteResolutionMode: "host-based",
    });
    app.route("/api/internal/sites", internalSitesRoutes);

    const res = await app.request("/api/internal/sites", {
      method: "POST",
      headers: {
        Authorization: "Bearer internal-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: "demo-cloud",
        primaryHost: "demo-cloud.example.com",
        siteName: "Demo Cloud",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      primaryHost: string;
      siteId: string;
      status: string;
    };

    expect(body.primaryHost).toBe("demo-cloud.example.com");
    expect(body.siteId).toMatch(/^sit_/);
    expect(body.status).toBe("active");

    const siteRows = sqlite
      .prepare('SELECT "key" FROM "site" WHERE "id" = ?')
      .all(body.siteId) as { key: string }[];
    const domainRows = sqlite
      .prepare('SELECT "host" FROM "site_domain" WHERE "site_id" = ?')
      .all(body.siteId) as { host: string }[];
    const settingRows = sqlite
      .prepare(
        'SELECT "key", "value" FROM "site_setting" WHERE "site_id" = ? ORDER BY "key" ASC',
      )
      .all(body.siteId) as { key: string; value: string }[];

    expect(siteRows).toEqual([{ key: "demo-cloud" }]);
    expect(domainRows).toEqual([{ host: "demo-cloud.example.com" }]);
    expect(settingRows).toEqual([
      { key: "ONBOARDING_STATUS", value: "completed" },
      { key: "SITE_NAME", value: "Demo Cloud" },
    ]);
  });
});
