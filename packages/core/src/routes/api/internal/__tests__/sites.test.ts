import { describe, expect, it } from "vitest";
import { createTestApp } from "../../../../__tests__/helpers/app.js";
import { DEFAULT_TEST_SITE_ID } from "../../../../__tests__/helpers/db.js";
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

  it("deletes a managed site without clearing other sites", async () => {
    const { app, sqlite } = createTestApp({
      authenticated: false,
      internalAdminToken: "internal-secret",
      siteResolutionMode: "host-based",
    });
    app.route("/api/internal/sites", internalSitesRoutes);

    const createRes = await app.request("/api/internal/sites", {
      method: "POST",
      headers: {
        Authorization: "Bearer internal-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: "delete-demo",
        primaryHost: "delete-demo.example.com",
        siteName: "Delete Demo",
      }),
    });

    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { siteId: string };
    const siteId = created.siteId;

    sqlite
      .prepare(
        `INSERT INTO "site_member" ("site_id", "user_id", "role", "created_at", "updated_at")
         VALUES (?, 'member_1', 'owner', 1774200001, 1774200001)`,
      )
      .run(siteId);
    sqlite
      .prepare(
        `INSERT INTO "post" ("id", "site_id", "format", "thread_id", "created_at", "updated_at")
         VALUES ('pst_delete_1', ?, 'note', 'pst_delete_1', 1774200002, 1774200002)`,
      )
      .run(siteId);
    sqlite
      .prepare(
        `INSERT INTO "site_setting" ("site_id", "key", "value", "updated_at")
         VALUES (?, 'SITE_AVATAR', 'sites/${siteId}/avatar.webp', 1774200003)`,
      )
      .run(siteId);

    const deleteRes = await app.request(`/api/internal/sites/${siteId}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer internal-secret",
      },
    });

    expect(deleteRes.status).toBe(204);

    const deletedSiteCount = sqlite
      .prepare('SELECT COUNT(*) AS count FROM "site" WHERE "id" = ?')
      .get(siteId) as { count: number };
    const deletedDomainCount = sqlite
      .prepare(
        'SELECT COUNT(*) AS count FROM "site_domain" WHERE "site_id" = ?',
      )
      .get(siteId) as { count: number };
    const deletedMemberCount = sqlite
      .prepare(
        'SELECT COUNT(*) AS count FROM "site_member" WHERE "site_id" = ?',
      )
      .get(siteId) as { count: number };
    const deletedPostCount = sqlite
      .prepare('SELECT COUNT(*) AS count FROM "post" WHERE "site_id" = ?')
      .get(siteId) as { count: number };
    const deletedSettingsCount = sqlite
      .prepare(
        'SELECT COUNT(*) AS count FROM "site_setting" WHERE "site_id" = ?',
      )
      .get(siteId) as { count: number };
    const defaultSiteCount = sqlite
      .prepare('SELECT COUNT(*) AS count FROM "site" WHERE "id" = ?')
      .get(DEFAULT_TEST_SITE_ID) as { count: number };

    expect(deletedSiteCount.count).toBe(0);
    expect(deletedDomainCount.count).toBe(0);
    expect(deletedMemberCount.count).toBe(0);
    expect(deletedPostCount.count).toBe(0);
    expect(deletedSettingsCount.count).toBe(0);
    expect(defaultSiteCount.count).toBe(1);
  });

  it("manages site domains for a hosted site", async () => {
    const { app } = createTestApp({
      authenticated: false,
      internalAdminToken: "internal-secret",
      siteResolutionMode: "host-based",
    });
    app.route("/api/internal/sites", internalSitesRoutes);

    const createRes = await app.request("/api/internal/sites", {
      method: "POST",
      headers: {
        Authorization: "Bearer internal-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: "domain-demo",
        primaryHost: "domain-demo.example.com",
        siteName: "Domain Demo",
      }),
    });

    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { siteId: string };

    const addRes = await app.request(
      `/api/internal/sites/${created.siteId}/domains`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer internal-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: "www.domain-demo.example.com",
          makePrimary: false,
        }),
      },
    );

    expect(addRes.status).toBe(201);
    const addedBody = (await addRes.json()) as {
      domains: Array<{ host: string; id: string; kind: string }>;
    };
    expect(addedBody.domains.map((domain) => domain.host)).toEqual([
      "domain-demo.example.com",
      "www.domain-demo.example.com",
    ]);
    expect(addedBody.domains[1]?.kind).toBe("alias");

    const aliasId = addedBody.domains[1]?.id;
    expect(aliasId).toBeTruthy();

    const setPrimaryRes = await app.request(
      `/api/internal/sites/${created.siteId}/domains/${aliasId}/primary`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer internal-secret",
        },
      },
    );

    expect(setPrimaryRes.status).toBe(200);
    const primaryBody = (await setPrimaryRes.json()) as {
      domains: Array<{
        host: string;
        id: string;
        kind: string;
        redirectToPrimary: boolean;
      }>;
    };
    expect(primaryBody.domains).toEqual([
      {
        host: "www.domain-demo.example.com",
        id: aliasId,
        kind: "primary",
        redirectToPrimary: true,
      },
      {
        host: "domain-demo.example.com",
        id: expect.any(String),
        kind: "alias",
        redirectToPrimary: true,
      },
    ]);

    const removeRes = await app.request(
      `/api/internal/sites/${created.siteId}/domains/${aliasId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer internal-secret",
        },
      },
    );

    expect(removeRes.status).toBe(409);
    expect(await removeRes.json()).toEqual({
      error: "Set another primary domain before removing this one.",
      code: "CONFLICT",
    });

    const listRes = await app.request(
      `/api/internal/sites/${created.siteId}/domains`,
      {
        headers: {
          Authorization: "Bearer internal-secret",
        },
      },
    );

    expect(listRes.status).toBe(200);
    expect(await listRes.json()).toEqual({
      domains: [
        {
          host: "www.domain-demo.example.com",
          id: aliasId,
          kind: "primary",
          redirectToPrimary: true,
        },
        {
          host: "domain-demo.example.com",
          id: expect.any(String),
          kind: "alias",
          redirectToPrimary: true,
        },
      ],
    });
  });
});
