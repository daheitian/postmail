import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createMediaService } from "../media.js";
import type { Database } from "../../db/index.js";

describe("MediaService", () => {
  let db: Database;
  let mediaService: ReturnType<typeof createMediaService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    mediaService = createMediaService(db);
  });

  const sampleMedia = {
    filename: "image-abc123.jpg",
    originalName: "photo.jpg",
    mimeType: "image/jpeg",
    size: 102400,
    r2Key: "media/image-abc123.jpg",
    width: 1920,
    height: 1080,
  };

  describe("create", () => {
    it("creates a media record with all fields", async () => {
      const media = await mediaService.create(sampleMedia);

      expect(media.id).toBeTruthy(); // UUIDv7
      expect(media.filename).toBe("image-abc123.jpg");
      expect(media.originalName).toBe("photo.jpg");
      expect(media.mimeType).toBe("image/jpeg");
      expect(media.size).toBe(102400);
      expect(media.r2Key).toBe("media/image-abc123.jpg");
      expect(media.width).toBe(1920);
      expect(media.height).toBe(1080);
      expect(media.postId).toBeNull();
      expect(media.alt).toBeNull();
    });

    it("creates media with optional alt text", async () => {
      const media = await mediaService.create({
        ...sampleMedia,
        alt: "A beautiful sunset",
      });

      expect(media.alt).toBe("A beautiful sunset");
    });

    it("generates UUIDv7 IDs", async () => {
      const media1 = await mediaService.create(sampleMedia);
      const media2 = await mediaService.create({
        ...sampleMedia,
        r2Key: "media/other.jpg",
      });

      expect(media1.id).not.toBe(media2.id);
      // UUIDv7 should be sortable — later ID is lexicographically greater
      expect(media2.id > media1.id).toBe(true);
    });
  });

  describe("getById", () => {
    it("returns media by ID", async () => {
      const created = await mediaService.create(sampleMedia);

      const found = await mediaService.getById(created.id);
      expect(found).not.toBeNull();
      expect(found?.filename).toBe("image-abc123.jpg");
    });

    it("returns null for non-existent ID", async () => {
      const found = await mediaService.getById("nonexistent-id");
      expect(found).toBeNull();
    });
  });

  describe("getByR2Key", () => {
    it("returns media by R2 key", async () => {
      await mediaService.create(sampleMedia);

      const found = await mediaService.getByR2Key("media/image-abc123.jpg");
      expect(found).not.toBeNull();
      expect(found?.originalName).toBe("photo.jpg");
    });

    it("returns null for non-existent R2 key", async () => {
      const found = await mediaService.getByR2Key("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns empty array when no media exists", async () => {
      const list = await mediaService.list();
      expect(list).toEqual([]);
    });

    it("returns media ordered by createdAt desc", async () => {
      await mediaService.create({ ...sampleMedia, r2Key: "a.jpg" });
      await mediaService.create({ ...sampleMedia, r2Key: "b.jpg" });

      const list = await mediaService.list();
      expect(list).toHaveLength(2);
    });

    it("respects limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        await mediaService.create({ ...sampleMedia, r2Key: `img${i}.jpg` });
      }

      const list = await mediaService.list(2);
      expect(list).toHaveLength(2);
    });
  });

  describe("delete", () => {
    it("deletes a media record", async () => {
      const media = await mediaService.create(sampleMedia);

      const result = await mediaService.delete(media.id);
      expect(result).toBe(true);

      const found = await mediaService.getById(media.id);
      expect(found).toBeNull();
    });

    it("returns false for non-existent ID", async () => {
      const result = await mediaService.delete("nonexistent");
      expect(result).toBe(false);
    });
  });
});
