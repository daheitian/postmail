/* eslint-disable @typescript-eslint/no-non-null-assertion -- Test assertions use ! for readability */
import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createMediaService } from "../media.js";
import { createPostService } from "../post.js";
import type { Database } from "../../db/index.js";

describe("MediaService", () => {
  let db: Database;
  let mediaService: ReturnType<typeof createMediaService>;
  let postService: ReturnType<typeof createPostService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    mediaService = createMediaService(db);
    postService = createPostService(db);
  });

  const sampleMedia = {
    filename: "0192a9f1-a2b7-7c3d-8e4f-5a6b7c8d9e0f.jpg",
    originalName: "photo.jpg",
    mimeType: "image/jpeg",
    size: 102400,
    storageKey: "media/2025/01/0192a9f1-a2b7-7c3d-8e4f-5a6b7c8d9e0f.jpg",
    width: 1920,
    height: 1080,
  };

  describe("create", () => {
    it("creates a media record with all fields", async () => {
      const media = await mediaService.create(sampleMedia);

      expect(media.id).toBeTruthy(); // UUIDv7
      expect(media.filename).toBe("0192a9f1-a2b7-7c3d-8e4f-5a6b7c8d9e0f.jpg");
      expect(media.originalName).toBe("photo.jpg");
      expect(media.mimeType).toBe("image/jpeg");
      expect(media.size).toBe(102400);
      expect(media.storageKey).toBe(
        "media/2025/01/0192a9f1-a2b7-7c3d-8e4f-5a6b7c8d9e0f.jpg",
      );
      expect(media.provider).toBe("r2");
      expect(media.width).toBe(1920);
      expect(media.height).toBe(1080);
      expect(media.postId).toBeNull();
      expect(media.alt).toBeNull();
      expect(media.position).toBe(0);
      expect(media.blurhash).toBeNull();
    });

    it("creates media with optional alt text", async () => {
      const media = await mediaService.create({
        ...sampleMedia,
        alt: "A beautiful sunset",
      });

      expect(media.alt).toBe("A beautiful sunset");
    });

    it("defaults provider to 'r2'", async () => {
      const media = await mediaService.create(sampleMedia);
      expect(media.provider).toBe("r2");
    });

    it("accepts provider 's3'", async () => {
      const media = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/2025/01/s3-upload.jpg",
        provider: "s3",
      });
      expect(media.provider).toBe("s3");
    });

    it("creates media with position and blurhash", async () => {
      const media = await mediaService.create({
        ...sampleMedia,
        position: 3,
        blurhash: "LKO2?U%2Tw=w]~RBVZRi};RPxuwH",
      });

      expect(media.position).toBe(3);
      expect(media.blurhash).toBe("LKO2?U%2Tw=w]~RBVZRi};RPxuwH");
    });

    it("generates UUIDv7 IDs", async () => {
      const media1 = await mediaService.create(sampleMedia);
      const media2 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/2025/01/other.jpg",
      });

      expect(media1.id).not.toBe(media2.id);
      // UUIDv7 should be sortable — later ID is lexicographically greater
      expect(media2.id > media1.id).toBe(true);
    });

    it("uses provided id when given", async () => {
      const customId = "0192a9f1-a2b7-7c3d-8e4f-custom000001";
      const media = await mediaService.create({
        ...sampleMedia,
        id: customId,
      });

      expect(media.id).toBe(customId);
    });

    it("auto-generates id when not provided", async () => {
      const media = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/2025/01/auto.jpg",
      });

      expect(media.id).toBeTruthy();
      // UUIDv7 format: 8-4-4-4-12 hex chars
      expect(media.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });
  });

  describe("getById", () => {
    it("returns media by ID", async () => {
      const created = await mediaService.create(sampleMedia);

      const found = await mediaService.getById(created.id);
      expect(found).not.toBeNull();
      expect(found?.filename).toBe("0192a9f1-a2b7-7c3d-8e4f-5a6b7c8d9e0f.jpg");
    });

    it("returns null for non-existent ID", async () => {
      const found = await mediaService.getById("nonexistent-id");
      expect(found).toBeNull();
    });
  });

  describe("getByIds", () => {
    it("returns media for valid IDs", async () => {
      const m1 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/a.jpg",
      });
      const m2 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/b.jpg",
      });

      const results = await mediaService.getByIds([m1.id, m2.id]);
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id).sort()).toEqual([m1.id, m2.id].sort());
    });

    it("returns empty array for empty input", async () => {
      const results = await mediaService.getByIds([]);
      expect(results).toEqual([]);
    });

    it("ignores non-existent IDs", async () => {
      const m1 = await mediaService.create(sampleMedia);

      const results = await mediaService.getByIds([m1.id, "nonexistent"]);
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe(m1.id);
    });
  });

  describe("getByPostId", () => {
    it("returns media ordered by position", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      const m1 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/a.jpg",
      });
      const m2 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/b.jpg",
      });

      await mediaService.attachToPost(post.id, [m2.id, m1.id]);

      const results = await mediaService.getByPostId(post.id);
      expect(results).toHaveLength(2);
      expect(results[0]!.id).toBe(m2.id);
      expect(results[0]!.position).toBe(0);
      expect(results[1]!.id).toBe(m1.id);
      expect(results[1]!.position).toBe(1);
    });

    it("returns empty array for post with no media", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      const results = await mediaService.getByPostId(post.id);
      expect(results).toEqual([]);
    });
  });

  describe("getByPostIds", () => {
    it("returns Map grouped by postId", async () => {
      const post1 = await postService.create({
        format: "note",
        body: "post 1",
      });
      const post2 = await postService.create({
        format: "note",
        body: "post 2",
      });

      const m1 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/a.jpg",
      });
      const m2 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/b.jpg",
      });
      const m3 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/c.jpg",
      });

      await mediaService.attachToPost(post1.id, [m1.id, m2.id]);
      await mediaService.attachToPost(post2.id, [m3.id]);

      const results = await mediaService.getByPostIds([post1.id, post2.id]);
      expect(results.size).toBe(2);
      expect(results.get(post1.id)).toHaveLength(2);
      expect(results.get(post2.id)).toHaveLength(1);
    });

    it("returns empty Map for empty input", async () => {
      const results = await mediaService.getByPostIds([]);
      expect(results.size).toBe(0);
    });

    it("returns ordered by position within each post", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      const m1 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/a.jpg",
      });
      const m2 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/b.jpg",
      });

      await mediaService.attachToPost(post.id, [m2.id, m1.id]);

      const results = await mediaService.getByPostIds([post.id]);
      const postMedia = results.get(post.id)!;
      expect(postMedia[0]!.id).toBe(m2.id);
      expect(postMedia[1]!.id).toBe(m1.id);
    });
  });

  describe("getByStorageKey", () => {
    it("returns media by R2 key", async () => {
      await mediaService.create(sampleMedia);

      const found = await mediaService.getByStorageKey(
        "media/2025/01/0192a9f1-a2b7-7c3d-8e4f-5a6b7c8d9e0f.jpg",
      );
      expect(found).not.toBeNull();
      expect(found?.originalName).toBe("photo.jpg");
    });

    it("returns null for non-existent R2 key", async () => {
      const found = await mediaService.getByStorageKey("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns empty array when no media exists", async () => {
      const list = await mediaService.list();
      expect(list).toEqual([]);
    });

    it("returns media ordered by createdAt desc", async () => {
      await mediaService.create({ ...sampleMedia, storageKey: "a.jpg" });
      await mediaService.create({ ...sampleMedia, storageKey: "b.jpg" });

      const list = await mediaService.list();
      expect(list).toHaveLength(2);
    });

    it("respects limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        await mediaService.create({
          ...sampleMedia,
          storageKey: `img${i}.jpg`,
        });
      }

      const list = await mediaService.list(2);
      expect(list).toHaveLength(2);
    });
  });

  describe("attachToPost", () => {
    it("sets postId and position for each media", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      const m1 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/a.jpg",
      });
      const m2 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/b.jpg",
      });

      await mediaService.attachToPost(post.id, [m1.id, m2.id]);

      const attached = await mediaService.getByPostId(post.id);
      expect(attached).toHaveLength(2);
      expect(attached[0]!.id).toBe(m1.id);
      expect(attached[0]!.position).toBe(0);
      expect(attached[1]!.id).toBe(m2.id);
      expect(attached[1]!.position).toBe(1);
    });

    it("replaces existing attachments", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      const m1 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/a.jpg",
      });
      const m2 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/b.jpg",
      });
      const m3 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/c.jpg",
      });

      await mediaService.attachToPost(post.id, [m1.id, m2.id]);
      await mediaService.attachToPost(post.id, [m3.id]);

      const attached = await mediaService.getByPostId(post.id);
      expect(attached).toHaveLength(1);
      expect(attached[0]!.id).toBe(m3.id);
      expect(attached[0]!.position).toBe(0);

      // Verify old media is detached
      const old1 = await mediaService.getById(m1.id);
      expect(old1!.postId).toBeNull();
      expect(old1!.position).toBe(0);
    });

    it("handles empty array by clearing all attachments", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      const m1 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/a.jpg",
      });

      await mediaService.attachToPost(post.id, [m1.id]);
      await mediaService.attachToPost(post.id, []);

      const attached = await mediaService.getByPostId(post.id);
      expect(attached).toHaveLength(0);
    });
  });

  describe("detachFromPost", () => {
    it("clears postId and resets position", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      const m1 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/a.jpg",
      });

      await mediaService.attachToPost(post.id, [m1.id]);
      await mediaService.detachFromPost(post.id);

      const attached = await mediaService.getByPostId(post.id);
      expect(attached).toHaveLength(0);

      const detached = await mediaService.getById(m1.id);
      expect(detached!.postId).toBeNull();
      expect(detached!.position).toBe(0);
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
