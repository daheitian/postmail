import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../../__tests__/helpers/db.js";
import { createSettingsService } from "../../../services/settings.js";
import { createNavItemService } from "../../../services/navigation.js";
import type { Database } from "../../../db/index.js";
import type { SettingsService } from "../../../services/settings.js";
import type { NavItemService } from "../../../services/navigation.js";

/**
 * Reproduces the seed logic from POST /setup to verify the default
 * navigation items are created correctly.
 */
async function runSetupSeed(services: {
  settings: SettingsService;
  navItems: NavItemService;
}) {
  await services.settings.completeOnboarding();

  await services.navItems.create({
    type: "system",
    systemKey: "collections",
  });
  await services.navItems.create({
    type: "system",
    systemKey: "archive",
  });
  await services.navItems.create({
    type: "system",
    systemKey: "rss",
  });
  await services.navItems.create({
    type: "system",
    systemKey: "settings",
  });
}

describe("Setup seed logic", () => {
  let services: {
    settings: SettingsService;
    navItems: NavItemService;
  };

  beforeEach(() => {
    const testDb = createTestDatabase();
    const db = testDb.db as unknown as Database;
    services = {
      settings: createSettingsService(db),
      navItems: createNavItemService(db),
    };
  });

  it("creates four nav items: Collections, Archive, RSS, Settings", async () => {
    await runSetupSeed(services);

    const navItemsList = await services.navItems.list();
    expect(navItemsList).toHaveLength(4);

    expect(navItemsList.map((item) => item.systemKey)).toEqual([
      "collections",
      "archive",
      "rss",
      "settings",
    ]);
  });

  it("creates system type nav items", async () => {
    await runSetupSeed(services);

    const navItemsList = await services.navItems.list();
    const systemItems = navItemsList.filter((item) => item.type === "system");

    expect(systemItems).toHaveLength(4);
  });
});
