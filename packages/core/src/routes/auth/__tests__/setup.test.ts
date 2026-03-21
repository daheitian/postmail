import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../../__tests__/helpers/db.js";
import { sql } from "drizzle-orm";
import { navItems, settings, siteDomains, sites } from "../../../db/schema.js";
import { createBootstrapService } from "../../../services/bootstrap.js";
import type { Database } from "../../../db/index.js";
import type { BootstrapService } from "../../../services/bootstrap.js";

/**
 * Reproduces the shell bootstrap logic from POST /setup to verify
 * setup stays idempotent even when managed shell data already exists.
 */
async function runSetupBootstrap(services: { bootstrap: BootstrapService }) {
  await services.bootstrap.completeInitialSetup({
    ownerUserId: "usr_test-owner",
    siteName: "Jant Demo",
  });
}

describe("Setup bootstrap logic", () => {
  let services: {
    bootstrap: BootstrapService;
    db: Database;
  };

  beforeEach(() => {
    const testDb = createTestDatabase();
    const db = testDb.db as unknown as Database;
    services = {
      db,
      bootstrap: createBootstrapService(db),
    };
  });

  it("creates four nav items: Collections, Archive, RSS, Settings", async () => {
    await runSetupBootstrap(services);

    const navItemsList = await services.db.select().from(navItems);
    expect(navItemsList).toHaveLength(4);

    expect(navItemsList.map((item) => item.systemKey)).toEqual([
      "collections",
      "archive",
      "rss",
      "settings",
    ]);
  });

  it("marks onboarding complete", async () => {
    await runSetupBootstrap(services);

    const rows = await services.db.select().from(settings);
    const onboardingRow = rows.find((row) => row.key === "ONBOARDING_STATUS");
    expect(onboardingRow?.value).toBe("completed");
  });

  it("is idempotent when default navigation already exists", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    await services.db.run(sql`
      INSERT INTO "nav_item" (
        "id",
        "site_id",
        "type",
        "system_key",
        "label",
        "url",
        "position",
        "created_at",
        "updated_at"
      )
      VALUES (
        'nav_test-existing',
        'sit_test00000000000000000000000',
        'system',
        'collections',
        'Collections',
        '/collections',
        'a0',
        ${timestamp},
        ${timestamp}
      )
    `);

    await runSetupBootstrap(services);

    const navItemsList = await services.db.select().from(navItems);
    const systemItems = navItemsList.filter((item) => item.type === "system");

    expect(systemItems).toHaveLength(4);
  });

  it("creates a site shell when setup runs after a factory reset", async () => {
    await services.db.run(sql`DELETE FROM "site_domain"`);
    await services.db.run(sql`DELETE FROM "site"`);

    await runSetupBootstrap(services);

    const siteRows = await services.db.select().from(sites);
    const domainRows = await services.db.select().from(siteDomains);
    expect(siteRows).toHaveLength(1);
    expect(domainRows).toHaveLength(0);
  });
});
