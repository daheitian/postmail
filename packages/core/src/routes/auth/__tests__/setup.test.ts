import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../../__tests__/helpers/db.js";
import { createSettingsService } from "../../../services/settings.js";
import { createNavItemService } from "../../../services/navigation.js";
import { createBootstrapService } from "../../../services/bootstrap.js";
import type { Database } from "../../../db/index.js";
import type { SettingsService } from "../../../services/settings.js";
import type { NavItemService } from "../../../services/navigation.js";
import type { BootstrapService } from "../../../services/bootstrap.js";

/**
 * Reproduces the shell bootstrap logic from POST /setup to verify
 * setup stays idempotent even when managed shell data already exists.
 */
async function runSetupBootstrap(services: { bootstrap: BootstrapService }) {
  await services.bootstrap.completeInitialSetup({
    siteName: "Jant Demo",
  });
}

describe("Setup bootstrap logic", () => {
  let services: {
    settings: SettingsService;
    navItems: NavItemService;
    bootstrap: BootstrapService;
  };

  beforeEach(() => {
    const testDb = createTestDatabase();
    const db = testDb.db as unknown as Database;
    const settings = createSettingsService(db);
    const navItems = createNavItemService(db);
    services = {
      settings,
      navItems,
      bootstrap: createBootstrapService(settings, navItems),
    };
  });

  it("creates four nav items: Collections, Archive, RSS, Settings", async () => {
    await runSetupBootstrap(services);

    const navItemsList = await services.navItems.list();
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

    await expect(services.settings.isOnboardingComplete()).resolves.toBe(true);
  });

  it("is idempotent when default navigation already exists", async () => {
    await services.navItems.create({
      type: "system",
      systemKey: "collections",
    });

    await runSetupBootstrap(services);

    const navItemsList = await services.navItems.list();
    const systemItems = navItemsList.filter((item) => item.type === "system");

    expect(systemItems).toHaveLength(4);
  });
});
