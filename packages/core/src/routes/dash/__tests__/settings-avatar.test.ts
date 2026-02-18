/**
 * Tests for avatar upload with favicon variant storage.
 *
 * Note: Route handlers that import JSX components with @lingui/react/macro
 * cannot run in vitest (requires SWC plugin). These tests verify the
 * service-layer and storage operations that the routes orchestrate.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../../__tests__/helpers/db.js";
import { createSettingsService } from "../../../services/settings.js";
import { createMediaService } from "../../../services/media.js";
import {
  arrayBufferToBase64,
  base64ToUint8Array,
} from "../../../lib/favicon.js";
import type { Database } from "../../../db/index.js";

describe("Dashboard Settings - Avatar Upload Logic", () => {
  let db: Database;
  let settingsService: ReturnType<typeof createSettingsService>;
  let mediaService: ReturnType<typeof createMediaService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    settingsService = createSettingsService(db);
    mediaService = createMediaService(db);
  });

  describe("avatar upload with favicon variants", () => {
    it("stores avatar media and sets SITE_AVATAR to storageKey", async () => {
      const storageKey = "media/2026/02/test-avatar-id.png";
      await mediaService.create({
        id: "test-avatar-id",
        filename: "test-avatar-id.png",
        originalName: "logo.png",
        mimeType: "image/png",
        size: 5000,
        storageKey,
        provider: "r2",
      });

      await settingsService.set("SITE_AVATAR", storageKey);

      const avatarKey = await settingsService.get("SITE_AVATAR");
      expect(avatarKey).toBe(storageKey);
    });

    it("stores favicon ICO as base64 in settings", async () => {
      const fakeIcoData = new Uint8Array([0, 0, 1, 0, 1, 0, 32, 32]);
      const b64 = arrayBufferToBase64(fakeIcoData.buffer);
      await settingsService.set("SITE_FAVICON_ICO", b64);

      const stored = await settingsService.get("SITE_FAVICON_ICO");
      expect(stored).not.toBeNull();
      const decoded = base64ToUint8Array(stored as string);
      expect(Array.from(decoded)).toEqual(Array.from(fakeIcoData));
    });

    it("stores apple-touch-icon as R2 storage key in settings", async () => {
      const appleTouchKey = "favicon/apple-touch-icon.png";
      await settingsService.set("SITE_FAVICON_APPLE_TOUCH", appleTouchKey);

      const stored = await settingsService.get("SITE_FAVICON_APPLE_TOUCH");
      expect(stored).toBe(appleTouchKey);
    });

    it("sets SITE_FAVICON_VERSION on upload", async () => {
      const version = "202602191430";
      await settingsService.set("SITE_FAVICON_VERSION", version);

      const stored = await settingsService.get("SITE_FAVICON_VERSION");
      expect(stored).toBe(version);
    });
  });

  describe("avatar removal cleans up favicon settings", () => {
    it("removes all favicon-related settings including version", async () => {
      await settingsService.set("SITE_AVATAR", "media/2026/02/some-id.png");
      await settingsService.set("SITE_FAVICON_ICO", "base64data");
      await settingsService.set(
        "SITE_FAVICON_APPLE_TOUCH",
        "favicon/apple-touch-icon.png",
      );
      await settingsService.set("SITE_FAVICON_VERSION", "202602191430");

      // Simulate avatar removal
      await settingsService.remove("SITE_AVATAR");
      await settingsService.remove("SITE_FAVICON_ICO");
      await settingsService.remove("SITE_FAVICON_APPLE_TOUCH");
      await settingsService.remove("SITE_FAVICON_VERSION");

      expect(await settingsService.get("SITE_AVATAR")).toBeNull();
      expect(await settingsService.get("SITE_FAVICON_ICO")).toBeNull();
      expect(await settingsService.get("SITE_FAVICON_APPLE_TOUCH")).toBeNull();
      expect(await settingsService.get("SITE_FAVICON_VERSION")).toBeNull();
    });
  });
});
