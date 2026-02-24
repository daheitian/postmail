/**
 * Tests for avatar upload/removal service methods.
 *
 * Note: Route handlers that import JSX components with @lingui/react/macro
 * cannot run in vitest (requires SWC plugin). These tests verify the
 * service-layer operations that the routes delegate to.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDatabase } from "../../../__tests__/helpers/db.js";
import { createSettingsService } from "../../../services/settings.js";
import { createMediaService } from "../../../services/media.js";
import {
  arrayBufferToBase64,
  base64ToUint8Array,
} from "../../../lib/favicon.js";
import type { Database } from "../../../db/index.js";
import type { StorageDriver } from "../../../lib/storage.js";

function createMockStorage(): StorageDriver {
  return {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockFile(
  name: string,
  type: string,
  size: number,
): { stream(): ReadableStream; name: string; type: string; size: number } {
  return {
    name,
    type,
    size,
    stream: () => new ReadableStream(),
  };
}

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

  describe("uploadAvatar", () => {
    it("stores avatar media and sets SITE_AVATAR to storageKey", async () => {
      const storage = createMockStorage();
      const file = createMockFile("logo.png", "image/png", 5000);

      await settingsService.uploadAvatar(
        { file },
        { media: mediaService, storage, storageProvider: "r2" },
      );

      const avatarKey = await settingsService.get("SITE_AVATAR");
      expect(avatarKey).not.toBeNull();
      expect(avatarKey).toContain("media/");
      expect(storage.put).toHaveBeenCalled();
    });

    it("creates media record for the avatar", async () => {
      const storage = createMockStorage();
      const file = createMockFile("logo.png", "image/png", 5000);

      await settingsService.uploadAvatar(
        { file },
        { media: mediaService, storage, storageProvider: "r2" },
      );

      const mediaList = await mediaService.list();
      expect(mediaList).toHaveLength(1);
      expect(mediaList[0].originalName).toBe("logo.png");
      expect(mediaList[0].mimeType).toBe("image/png");
      expect(mediaList[0].provider).toBe("r2");
    });

    it("stores favicon ICO as base64 in settings", async () => {
      const storage = createMockStorage();
      const file = createMockFile("logo.png", "image/png", 5000);
      const fakeIcoData = new Uint8Array([0, 0, 1, 0, 1, 0, 32, 32]);

      await settingsService.uploadAvatar(
        { file, faviconIco: fakeIcoData.buffer },
        { media: mediaService, storage, storageProvider: "r2" },
      );

      const stored = await settingsService.get("SITE_FAVICON_ICO");
      expect(stored).not.toBeNull();
      const decoded = base64ToUint8Array(stored as string);
      expect(Array.from(decoded)).toEqual(Array.from(fakeIcoData));
    });

    it("stores apple-touch-icon in storage and sets key in settings", async () => {
      const storage = createMockStorage();
      const file = createMockFile("logo.png", "image/png", 5000);
      const appleTouchData = new Uint8Array([137, 80, 78, 71]).buffer;

      await settingsService.uploadAvatar(
        { file, appleTouchIcon: appleTouchData },
        { media: mediaService, storage, storageProvider: "r2" },
      );

      const stored = await settingsService.get("SITE_FAVICON_APPLE_TOUCH");
      expect(stored).toBe("favicon/apple-touch-icon.png");
      // storage.put should be called twice: avatar file + apple-touch-icon
      expect(storage.put).toHaveBeenCalledTimes(2);
    });

    it("sets SITE_FAVICON_VERSION on upload", async () => {
      const storage = createMockStorage();
      const file = createMockFile("logo.png", "image/png", 5000);

      await settingsService.uploadAvatar(
        { file },
        { media: mediaService, storage, storageProvider: "r2" },
      );

      const stored = await settingsService.get("SITE_FAVICON_VERSION");
      expect(stored).not.toBeNull();
      expect(stored).toMatch(/^\d{12}$/);
    });

    it("throws ValidationError for disallowed file type", async () => {
      const storage = createMockStorage();
      const file = createMockFile("doc.pdf", "application/pdf", 5000);

      await expect(
        settingsService.uploadAvatar(
          { file },
          { media: mediaService, storage, storageProvider: "r2" },
        ),
      ).rejects.toThrow("File type not allowed");
    });

    it("throws ValidationError for oversized file", async () => {
      const storage = createMockStorage();
      const file = createMockFile("big.png", "image/png", 20 * 1024 * 1024);

      await expect(
        settingsService.uploadAvatar(
          { file },
          { media: mediaService, storage, storageProvider: "r2" },
        ),
      ).rejects.toThrow("File too large");
    });
  });

  describe("removeAvatar", () => {
    it("removes all favicon-related settings", async () => {
      await settingsService.set("SITE_AVATAR", "media/2026/02/some-id.png");
      await settingsService.set("SITE_FAVICON_ICO", "base64data");
      await settingsService.set(
        "SITE_FAVICON_APPLE_TOUCH",
        "favicon/apple-touch-icon.png",
      );
      await settingsService.set("SITE_FAVICON_VERSION", "202602191430");

      await settingsService.removeAvatar();

      expect(await settingsService.get("SITE_AVATAR")).toBeNull();
      expect(await settingsService.get("SITE_FAVICON_ICO")).toBeNull();
      expect(await settingsService.get("SITE_FAVICON_APPLE_TOUCH")).toBeNull();
      expect(await settingsService.get("SITE_FAVICON_VERSION")).toBeNull();
    });

    it("deletes apple-touch-icon from storage when storage is provided", async () => {
      const storage = createMockStorage();
      await settingsService.set(
        "SITE_FAVICON_APPLE_TOUCH",
        "favicon/apple-touch-icon.png",
      );

      await settingsService.removeAvatar(storage);

      expect(storage.delete).toHaveBeenCalledWith(
        "favicon/apple-touch-icon.png",
      );
    });

    it("skips storage delete when no apple-touch-icon key exists", async () => {
      const storage = createMockStorage();

      await settingsService.removeAvatar(storage);

      expect(storage.delete).not.toHaveBeenCalled();
    });

    it("handles null storage gracefully", async () => {
      await settingsService.set("SITE_AVATAR", "media/2026/02/some-id.png");
      await settingsService.set(
        "SITE_FAVICON_APPLE_TOUCH",
        "favicon/apple-touch-icon.png",
      );

      await settingsService.removeAvatar(null);

      expect(await settingsService.get("SITE_AVATAR")).toBeNull();
      expect(await settingsService.get("SITE_FAVICON_APPLE_TOUCH")).toBeNull();
    });
  });

  describe("arrayBufferToBase64 / base64ToUint8Array roundtrip", () => {
    it("encodes and decodes correctly", () => {
      const original = new Uint8Array([0, 0, 1, 0, 1, 0, 32, 32]);
      const b64 = arrayBufferToBase64(original.buffer);
      const decoded = base64ToUint8Array(b64);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });
  });
});
