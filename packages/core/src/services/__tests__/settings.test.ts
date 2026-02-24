import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createSettingsService } from "../settings.js";
import type { Database } from "../../db/index.js";

describe("SettingsService", () => {
  let db: Database;
  let settingsService: ReturnType<typeof createSettingsService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    settingsService = createSettingsService(db);
  });

  describe("get", () => {
    it("returns null for non-existent key", async () => {
      const result = await settingsService.get("SITE_NAME");
      expect(result).toBeNull();
    });

    it("returns value after set", async () => {
      await settingsService.set("SITE_NAME", "My Blog");
      const result = await settingsService.get("SITE_NAME");
      expect(result).toBe("My Blog");
    });
  });

  describe("set", () => {
    it("creates a new setting", async () => {
      await settingsService.set("SITE_NAME", "Test Site");
      const result = await settingsService.get("SITE_NAME");
      expect(result).toBe("Test Site");
    });

    it("updates existing setting (upsert)", async () => {
      await settingsService.set("SITE_NAME", "Original");
      await settingsService.set("SITE_NAME", "Updated");
      const result = await settingsService.get("SITE_NAME");
      expect(result).toBe("Updated");
    });
  });

  describe("getAll", () => {
    it("returns empty object when no settings exist", async () => {
      const result = await settingsService.getAll();
      expect(result).toEqual({});
    });

    it("returns all settings as key-value pairs", async () => {
      await settingsService.set("SITE_NAME", "My Blog");
      await settingsService.set("SITE_DESCRIPTION", "A cool blog");

      const result = await settingsService.getAll();
      expect(result).toEqual({
        SITE_NAME: "My Blog",
        SITE_DESCRIPTION: "A cool blog",
      });
    });
  });

  describe("setMany", () => {
    it("sets multiple values at once", async () => {
      await settingsService.setMany({
        SITE_NAME: "My Blog",
        SITE_DESCRIPTION: "Description",
      });

      expect(await settingsService.get("SITE_NAME")).toBe("My Blog");
      expect(await settingsService.get("SITE_DESCRIPTION")).toBe("Description");
    });

    it("skips undefined values", async () => {
      await settingsService.set("SITE_NAME", "Original");
      await settingsService.setMany({
        SITE_NAME: undefined,
        SITE_DESCRIPTION: "New",
      });

      expect(await settingsService.get("SITE_NAME")).toBe("Original");
      expect(await settingsService.get("SITE_DESCRIPTION")).toBe("New");
    });
  });

  describe("remove", () => {
    it("removes a setting", async () => {
      await settingsService.set("SITE_NAME", "Test");
      await settingsService.remove("SITE_NAME");
      const result = await settingsService.get("SITE_NAME");
      expect(result).toBeNull();
    });

    it("does not throw when removing non-existent key", async () => {
      await expect(settingsService.remove("SITE_NAME")).resolves.not.toThrow();
    });
  });

  describe("updateGeneral", () => {
    const defaults = {
      siteName: "",
      siteDescription: "",
      siteFooter: "",
      siteLanguage: "en",
      homeDefaultView: "latest",
      headerNavMaxVisible: "2",
      timeZone: "UTC",
    };

    it("sets non-empty values", async () => {
      await settingsService.updateGeneral(
        { ...defaults, siteName: "My Blog", siteDescription: "A blog" },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(await settingsService.get("SITE_NAME")).toBe("My Blog");
      expect(await settingsService.get("SITE_DESCRIPTION")).toBe("A blog");
    });

    it("removes empty values", async () => {
      await settingsService.set("SITE_NAME", "Old Name");
      await settingsService.updateGeneral(
        { ...defaults, siteName: "" },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(await settingsService.get("SITE_NAME")).toBeNull();
    });

    it("trims whitespace from values", async () => {
      await settingsService.updateGeneral(
        { ...defaults, siteName: "  Trimmed  " },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(await settingsService.get("SITE_NAME")).toBe("Trimmed");
    });

    it("removes HOME_DEFAULT_VIEW when set to default", async () => {
      await settingsService.set("HOME_DEFAULT_VIEW", "featured");
      await settingsService.updateGeneral(
        { ...defaults, homeDefaultView: "latest" },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(await settingsService.get("HOME_DEFAULT_VIEW")).toBeNull();
    });

    it("stores HOME_DEFAULT_VIEW when set to featured", async () => {
      await settingsService.updateGeneral(
        { ...defaults, homeDefaultView: "featured" },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(await settingsService.get("HOME_DEFAULT_VIEW")).toBe("featured");
    });

    it("removes HEADER_NAV_MAX_VISIBLE when set to default (2)", async () => {
      await settingsService.set("HEADER_NAV_MAX_VISIBLE", "5");
      await settingsService.updateGeneral(
        { ...defaults, headerNavMaxVisible: "2" },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(await settingsService.get("HEADER_NAV_MAX_VISIBLE")).toBeNull();
    });

    it("stores HEADER_NAV_MAX_VISIBLE when non-default", async () => {
      await settingsService.updateGeneral(
        { ...defaults, headerNavMaxVisible: "5" },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(await settingsService.get("HEADER_NAV_MAX_VISIBLE")).toBe("5");
    });

    it("removes TIME_ZONE when set to UTC", async () => {
      await settingsService.set("TIME_ZONE", "America/New_York");
      await settingsService.updateGeneral(
        { ...defaults, timeZone: "UTC" },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(await settingsService.get("TIME_ZONE")).toBeNull();
    });

    it("stores TIME_ZONE when non-default", async () => {
      await settingsService.updateGeneral(
        { ...defaults, timeZone: "America/New_York" },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(await settingsService.get("TIME_ZONE")).toBe("America/New_York");
    });

    it("detects language change", async () => {
      const result = await settingsService.updateGeneral(
        { ...defaults, siteLanguage: "sv" },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(result.languageChanged).toBe(true);
    });

    it("returns no language change when same", async () => {
      const result = await settingsService.updateGeneral(defaults, {
        oldLanguage: "en",
        fallbackSiteName: "Jant",
      });

      expect(result.languageChanged).toBe(false);
    });

    it("returns display name from siteName when non-empty", async () => {
      const result = await settingsService.updateGeneral(
        { ...defaults, siteName: "My Blog" },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(result.displayName).toBe("My Blog");
    });

    it("returns fallback display name when siteName is empty", async () => {
      const result = await settingsService.updateGeneral(defaults, {
        oldLanguage: "en",
        fallbackSiteName: "Jant",
      });

      expect(result.displayName).toBe("Jant");
    });

    it("stores footer when non-empty", async () => {
      await settingsService.updateGeneral(
        { ...defaults, siteFooter: "© 2026" },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(await settingsService.get("SITE_FOOTER")).toBe("© 2026");
    });

    it("removes footer when empty", async () => {
      await settingsService.set("SITE_FOOTER", "Old footer");
      await settingsService.updateGeneral(
        { ...defaults, siteFooter: "" },
        { oldLanguage: "en", fallbackSiteName: "Jant" },
      );

      expect(await settingsService.get("SITE_FOOTER")).toBeNull();
    });
  });

  describe("onboarding", () => {
    it("returns false when onboarding is not complete", async () => {
      const result = await settingsService.isOnboardingComplete();
      expect(result).toBe(false);
    });

    it("returns true after completing onboarding", async () => {
      await settingsService.completeOnboarding();
      const result = await settingsService.isOnboardingComplete();
      expect(result).toBe(true);
    });
  });
});
