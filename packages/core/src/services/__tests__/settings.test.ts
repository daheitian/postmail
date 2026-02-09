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
