import { describe, expect, it } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { sqliteSchemaBundle } from "../../db/schema-bundle.js";
import { ConflictError } from "../../lib/errors.js";
import { createSiteAdminService } from "../site-admin.js";

describe("SiteAdminService", () => {
  it("rejects managed site creation in single-site mode", async () => {
    const { db } = createTestDatabase();
    const service = createSiteAdminService(db, sqliteSchemaBundle, "sqlite", {
      siteResolutionMode: "single-site",
    });

    await expect(
      service.createManagedSite({
        key: "demo-cloud",
        primaryHost: "demo-cloud.example.com",
        siteName: "Demo Cloud",
      }),
    ).rejects.toEqual(
      new ConflictError(
        "Managed site operations are only available in host-based mode.",
      ),
    );
  });

  it("creates managed sites in host-based mode", async () => {
    const { db, sqlite } = createTestDatabase();
    const service = createSiteAdminService(db, sqliteSchemaBundle, "sqlite", {
      siteResolutionMode: "host-based",
    });

    const created = await service.createManagedSite({
      key: "demo-cloud",
      primaryHost: "demo-cloud.example.com",
      siteName: "Demo Cloud",
    });

    expect(created.site.id).toMatch(/^sit_/);
    expect(created.domain.host).toBe("demo-cloud.example.com");

    const siteRows = sqlite
      .prepare('SELECT "key" FROM "site" WHERE "id" = ?')
      .all(created.site.id) as { key: string }[];

    expect(siteRows).toEqual([{ key: "demo-cloud" }]);
  });
});
