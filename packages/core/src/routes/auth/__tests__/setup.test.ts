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
    type: "link",
    label: "Collections",
    url: "/c",
  });
  await services.navItems.create({
    type: "link",
    label: "Archive",
    url: "/archive",
  });
  await services.navItems.create({
    type: "system",
    label: "RSS",
    url: "/feed",
  });
  await services.navItems.create({
    type: "system",
    label: "Dashboard",
    url: "/dash",
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

  it("creates four nav items: Collections, Archive, RSS, Dashboard", async () => {
    await runSetupSeed(services);

    const navItemsList = await services.navItems.list();
    expect(navItemsList).toHaveLength(4);

    const labels = navItemsList.map((item) => item.label);
    expect(labels).toContain("Collections");
    expect(labels).toContain("Archive");
    expect(labels).toContain("RSS");
    expect(labels).toContain("Dashboard");
  });

  it("creates link and system type nav items", async () => {
    await runSetupSeed(services);

    const navItemsList = await services.navItems.list();
    const linkItems = navItemsList.filter((item) => item.type === "link");
    const systemItems = navItemsList.filter((item) => item.type === "system");

    expect(linkItems).toHaveLength(2);
    expect(systemItems).toHaveLength(2);
  });
});
