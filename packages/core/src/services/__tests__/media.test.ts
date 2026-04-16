/* eslint-disable @typescript-eslint/no-non-null-assertion -- Test assertions use ! for readability */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createTestDatabase,
  DEFAULT_TEST_SITE_ID,
} from "../../__tests__/helpers/db.js";
import { createMediaService, textAttachmentJsonKey } from "../media.js";
import { createPostService } from "../post.js";
import type { Database } from "../../db/index.js";
import { MediaQuotaExceededError } from "../../lib/errors.js";

interface MockStorageFile {
  body: Uint8Array;
  contentType?: string;
  cacheControl?: string;
}

function createMockStorage() {
  const files = new Map<string, MockStorageFile>();

  return {
    files,
    async put(
      key: string,
      body: Uint8Array | ReadableStream,
      opts?: { contentType?: string; cacheControl?: string },
    ) {
      const bytes =
        body instanceof Uint8Array
          ? body
          : new Uint8Array(await new Response(body).arrayBuffer());
      files.set(key, {
        body: bytes,
        contentType: opts?.contentType,
        cacheControl: opts?.cacheControl,
      });
    },
    async get(key: string) {
      const file = files.get(key);
      if (!file) return null;
      return {
        body: new Response(file.body).body as ReadableStream,
        contentType: file.contentType,
        cacheControl: file.cacheControl,
      };
    },
    async delete(key: string) {
      files.delete(key);
    },
  };
}

describe("MediaService", () => {
  let db: Database;
  let mediaService: ReturnType<typeof createMediaService>;
  let postService: ReturnType<typeof createPostService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    mediaService = createMediaService(db, DEFAULT_TEST_SITE_ID);
    postService = createPostService(
      db,
      { slugIdLength: 5 },
      DEFAULT_TEST_SITE_ID,
    );
  });

  const sampleMedia = {
    filename: "0192a9f1-a2b7-7c3d-8e4f-5a6b7c8d9e0f.jpg",
    originalName: "photo.jpg",
    mimeType: "image/jpeg",
    size: 102400,
    storageKey: "media/0192a9f1-a2b7-7c3d-8e4f-5a6b7c8d9e0f.jpg",
    width: 1920,
    height: 1080,
  };

  describe("assertCanWriteBytes", () => {
    it("is a no-op when hosted quota enforcement is disabled", async () => {
      await expect(
        mediaService.assertCanWriteBytes(1024),
      ).resolves.toBeUndefined();
    });

    it("delegates hosted quota checks to the control plane when enabled", async () => {
      const checkMediaWriteQuota = vi.fn(async () => ({
        allowed: true,
        limitBytes: 50_000,
        remainingBytes: 40_000,
        usedBytes: 10_000,
      }));
      const hostedQuotaService = createMediaService(
        db,
        DEFAULT_TEST_SITE_ID,
        undefined,
        undefined,
        {
          enforceHostedQuota: true,
          hostedControlPlane: {
            checkMediaWriteQuota,
            async syncSiteMetadata() {},
          },
        },
      );

      await expect(
        hostedQuotaService.assertCanWriteBytes(2048),
      ).resolves.toBeUndefined();
      expect(checkMediaWriteQuota).toHaveBeenCalledWith({
        additionalBytes: 2048,
        coreSiteId: DEFAULT_TEST_SITE_ID,
      });
    });

    it("throws when a hosted upload would exceed the shared quota", async () => {
      const hostedQuotaService = createMediaService(
        db,
        DEFAULT_TEST_SITE_ID,
        undefined,
        undefined,
        {
          enforceHostedQuota: true,
          hostedControlPlane: {
            async checkMediaWriteQuota() {
              return {
                allowed: false,
                limitBytes: 50_000,
                remainingBytes: 0,
                usedBytes: 50_000,
              };
            },
            async syncSiteMetadata() {},
          },
        },
      );

      await expect(
        hostedQuotaService.assertCanWriteBytes(2048),
      ).rejects.toBeInstanceOf(MediaQuotaExceededError);
    });
  });

  describe("create", () => {
    it("creates a media record with all fields", async () => {
      const media = await mediaService.create(sampleMedia);

      expect(media.id).toBeTruthy(); // TypeID
      expect(media.filename).toBe("0192a9f1-a2b7-7c3d-8e4f-5a6b7c8d9e0f.jpg");
      expect(media.originalName).toBe("photo.jpg");
      expect(media.mimeType).toBe("image/jpeg");
      expect(media.size).toBe(102400);
      expect(media.storageKey).toBe(
        "media/0192a9f1-a2b7-7c3d-8e4f-5a6b7c8d9e0f.jpg",
      );
      expect(media.provider).toBe("r2");
      expect(media.width).toBe(1920);
      expect(media.height).toBe(1080);
      expect(media.postId).toBeNull();
      expect(media.alt).toBeNull();
      expect(media.position).toBe("a0");
      expect(media.blurhash).toBeNull();
      expect(media.posterKey).toBeNull();
    });

    it("creates media with posterKey", async () => {
      const media = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/video.mp4",
        posterKey: "media/video.poster.webp",
      });

      expect(media.posterKey).toBe("media/video.poster.webp");
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
        storageKey: "media/s3-upload.jpg",
        provider: "s3",
      });
      expect(media.provider).toBe("s3");
    });

    it("rejects unsupported storage providers", async () => {
      await expect(
        mediaService.create({
          ...sampleMedia,
          storageKey: "media/bad-provider.jpg",
          provider: "gcs" as never,
        }),
      ).rejects.toThrow("Storage provider must be r2, s3, or local.");
    });

    it("rejects unsupported media kinds", async () => {
      await expect(
        mediaService.create({
          ...sampleMedia,
          storageKey: "media/bad-kind.jpg",
          mediaKind: "binary" as never,
        }),
      ).rejects.toThrow(
        "Media kind must be image, video, audio, text, or document.",
      );
    });

    it("creates media with position and blurhash", async () => {
      const media = await mediaService.create({
        ...sampleMedia,
        position: "a3",
        blurhash: "LKO2?U%2Tw=w]~RBVZRi};RPxuwH",
      });

      expect(media.position).toBe("a3");
      expect(media.blurhash).toBe("LKO2?U%2Tw=w]~RBVZRi};RPxuwH");
    });

    it("appends position when creating media already attached to a post", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
      });

      const media1 = await mediaService.create({
        ...sampleMedia,
        postId: post.id,
      });
      const media2 = await mediaService.create({
        ...sampleMedia,
        postId: post.id,
        storageKey: "media/second.jpg",
      });

      expect(media1.position).toBe("a0");
      expect(media2.position).toBe("a1");
    });

    it("generates sortable TypeIDs", async () => {
      const media1 = await mediaService.create(sampleMedia);
      const media2 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/other.jpg",
      });

      expect(media1.id).not.toBe(media2.id);
      // TypeIDs remain lexicographically sortable because they preserve time ordering.
      expect(media2.id > media1.id).toBe(true);
    });

    it("uses provided id when given", async () => {
      const customId = "med_01jpyxdk1m7w4v8s2r5c9b3qfh";
      const media = await mediaService.create({
        ...sampleMedia,
        id: customId,
      });

      expect(media.id).toBe(customId);
    });

    it("auto-generates id when not provided", async () => {
      const media = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/auto.jpg",
      });

      expect(media.id).toBeTruthy();
      expect(media.id).toMatch(/^med_[a-z0-9]{26}$/);
    });

    it("rejects non-positive sizes at the database layer", async () => {
      await expect(
        mediaService.create({
          ...sampleMedia,
          storageKey: "media/invalid-size.jpg",
          size: 0,
        }),
      ).rejects.toThrow();
    });

    it("rejects blank positions at the database layer", async () => {
      await expect(
        mediaService.create({
          ...sampleMedia,
          storageKey: "media/invalid-position.jpg",
          position: "   ",
        }),
      ).rejects.toThrow();
    });

    it("rejects non-positive dimensions at the database layer", async () => {
      await expect(
        mediaService.create({
          ...sampleMedia,
          storageKey: "media/invalid-dimensions.jpg",
          width: 0,
        }),
      ).rejects.toThrow();
    });

    it("rejects negative extracted text length at the database layer", async () => {
      await expect(
        mediaService.create({
          ...sampleMedia,
          storageKey: "media/invalid-chars.jpg",
          chars: -1,
        }),
      ).rejects.toThrow();
    });
  });

  describe("createTextAttachment", () => {
    it("writes a .html public artifact and a .json source as sibling objects", async () => {
      const storage = createMockStorage();

      const media = await mediaService.createTextAttachment(
        {
          contentFormat: "markdown",
          content: "# Heading\n\nBody text",
        },
        {
          storage,
          storageDriver: "local",
          maxFileSizeMB: 1,
        },
      );

      expect(media.mimeType).toBe("text/html; charset=utf-8");
      expect(media.mediaKind).toBe("text");
      expect(media.provider).toBe("local");
      expect(media.summary).toBe("Heading Body text");
      expect(media.chars).toBe(17);
      expect(media.originalName).toBe("attached-text.html");
      expect(media.storageKey.endsWith(".html")).toBe(true);

      const htmlKey = media.storageKey;
      const jsonKey = textAttachmentJsonKey(htmlKey);
      expect(jsonKey).toBe(htmlKey.replace(/\.html$/, ".json"));

      const htmlFile = storage.files.get(htmlKey);
      expect(htmlFile).toBeDefined();
      expect(htmlFile!.contentType).toBe("text/html; charset=utf-8");
      expect(htmlFile!.cacheControl).toBe(
        "public, max-age=31536000, immutable",
      );
      const htmlText = new TextDecoder().decode(htmlFile!.body);
      expect(htmlText).toContain("<h1");
      expect(htmlText).toContain("Heading");

      const jsonFile = storage.files.get(jsonKey);
      expect(jsonFile).toBeDefined();
      expect(jsonFile!.contentType).toBe("application/json");
      expect(jsonFile!.cacheControl).toBe(
        "public, max-age=31536000, immutable",
      );
      const jsonText = new TextDecoder().decode(jsonFile!.body);
      const jsonDoc = JSON.parse(jsonText) as { type: string };
      expect(jsonDoc.type).toBe("doc");
    });

    it("sets media.size to the HTML artifact byte length", async () => {
      const storage = createMockStorage();
      const media = await mediaService.createTextAttachment(
        {
          contentFormat: "markdown",
          content: "# Heading\n\nBody text",
        },
        {
          storage,
          storageDriver: "local",
          maxFileSizeMB: 1,
        },
      );
      const htmlFile = storage.files.get(media.storageKey);
      expect(media.size).toBe(htmlFile!.body.byteLength);
    });

    it("rolls back the .json sibling when the .html put fails", async () => {
      const storage = createMockStorage();
      const originalPut = storage.put.bind(storage);
      const put = vi
        .fn(async (key: string, body: Uint8Array, opts?: unknown) => {
          if (key.endsWith(".html")) {
            throw new Error("simulated HTML put failure");
          }
          return originalPut(key, body, opts as never);
        })
        .mockName("failingPut");
      const flakyStorage = { ...storage, put };

      await expect(
        mediaService.createTextAttachment(
          {
            contentFormat: "markdown",
            content: "body",
          },
          {
            storage: flakyStorage,
            storageDriver: "local",
            maxFileSizeMB: 1,
          },
        ),
      ).rejects.toThrow("simulated HTML put failure");

      // JSON was written then cleaned up — no stranded source objects.
      expect(storage.files.size).toBe(0);
    });

    it("rejects non-markdown input formats", async () => {
      const storage = createMockStorage();
      await expect(
        mediaService.createTextAttachment(
          {
            contentFormat: "html" as never,
            content: "<p>hi</p>",
          },
          {
            storage,
            storageDriver: "local",
            maxFileSizeMB: 1,
          },
        ),
      ).rejects.toThrow("Unsupported text attachment format");
    });
  });

  describe("getTextAttachmentContent", () => {
    it("reads the .json sibling and converts Tiptap back to markdown", async () => {
      const storage = createMockStorage();
      const media = await mediaService.createTextAttachment(
        {
          contentFormat: "markdown",
          content: "# Heading\n\nBody text",
        },
        {
          storage,
          storageDriver: "local",
          maxFileSizeMB: 1,
        },
      );

      const content = await mediaService.getTextAttachmentContent(
        media.id,
        storage,
      );

      expect(content).toEqual({
        id: media.id,
        type: "text",
        contentFormat: "markdown",
        content: "# Heading\n\nBody text",
        summary: "Heading Body text",
        chars: 17,
      });
    });

    it("returns null when the .json sibling is missing", async () => {
      const storage = createMockStorage();
      const media = await mediaService.createTextAttachment(
        {
          contentFormat: "markdown",
          content: "hello",
        },
        {
          storage,
          storageDriver: "local",
          maxFileSizeMB: 1,
        },
      );

      await storage.delete(textAttachmentJsonKey(media.storageKey));

      await expect(
        mediaService.getTextAttachmentContent(media.id, storage),
      ).resolves.toBeNull();
    });

    it("returns null for non-text attachments", async () => {
      const media = await mediaService.create(sampleMedia);
      const storage = createMockStorage();

      await expect(
        mediaService.getTextAttachmentContent(media.id, storage),
      ).resolves.toBeNull();
    });
  });

  describe("getTextAttachmentHtml", () => {
    it("reads the pre-rendered HTML directly from storageKey", async () => {
      const storage = createMockStorage();
      const media = await mediaService.createTextAttachment(
        {
          contentFormat: "markdown",
          content: "# Heading\n\nBody text",
        },
        {
          storage,
          storageDriver: "local",
          maxFileSizeMB: 1,
        },
      );

      const result = await mediaService.getTextAttachmentHtml(
        media.id,
        storage,
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe(media.id);
      expect(result!.html).toContain("<h1");
      expect(result!.html).toContain("Heading");
      expect(result!.summary).toBe("Heading Body text");
      expect(result!.chars).toBe(17);
    });

    it("returns null for non-text attachments", async () => {
      const storage = createMockStorage();
      const media = await mediaService.create(sampleMedia);

      await expect(
        mediaService.getTextAttachmentHtml(media.id, storage),
      ).resolves.toBeNull();
    });
  });

  describe("delete for text attachments", () => {
    it("removes both .html and .json siblings from storage", async () => {
      const storage = createMockStorage();
      const media = await mediaService.createTextAttachment(
        {
          contentFormat: "markdown",
          content: "goodbye",
        },
        {
          storage,
          storageDriver: "local",
          maxFileSizeMB: 1,
        },
      );

      expect(storage.files.size).toBe(2);

      await mediaService.delete(media.id, storage);

      expect(storage.files.size).toBe(0);
      expect(storage.files.has(media.storageKey)).toBe(false);
      expect(storage.files.has(textAttachmentJsonKey(media.storageKey))).toBe(
        false,
      );
    });
  });

  describe("deleteByIds for text attachments", () => {
    it("removes siblings for every text attachment in the batch", async () => {
      const storage = createMockStorage();
      const a = await mediaService.createTextAttachment(
        { contentFormat: "markdown", content: "first" },
        { storage, storageDriver: "local", maxFileSizeMB: 1 },
      );
      const b = await mediaService.createTextAttachment(
        { contentFormat: "markdown", content: "second" },
        { storage, storageDriver: "local", maxFileSizeMB: 1 },
      );

      expect(storage.files.size).toBe(4);

      await mediaService.deleteByIds([a.id, b.id], storage);

      expect(storage.files.size).toBe(0);
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
        bodyMarkdown: "test",
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
      expect(results[0]!.position).toBe("a0");
      expect(results[1]!.id).toBe(m1.id);
      expect(results[1]!.position).toBe("a1");
    });

    it("returns empty array for post with no media", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
      });

      const results = await mediaService.getByPostId(post.id);
      expect(results).toEqual([]);
    });
  });

  describe("getByPostIds", () => {
    it("returns Map grouped by postId", async () => {
      const post1 = await postService.create({
        format: "note",
        bodyMarkdown: "post 1",
      });
      const post2 = await postService.create({
        format: "note",
        bodyMarkdown: "post 2",
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
        bodyMarkdown: "test",
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

  describe("validateIds", () => {
    it("passes for valid IDs", async () => {
      const m1 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/a.jpg",
      });
      const m2 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/b.jpg",
      });

      await expect(
        mediaService.validateIds([m1.id, m2.id]),
      ).resolves.not.toThrow();
    });

    it("is a no-op for empty array", async () => {
      await expect(mediaService.validateIds([])).resolves.not.toThrow();
    });

    it("throws ValidationError when count exceeds limit", async () => {
      const ids = Array.from({ length: 21 }, (_, i) => `fake-id-${i}`);
      await expect(mediaService.validateIds(ids)).rejects.toThrow(
        "at most 20 attachments",
      );
    });

    it("throws ValidationError when IDs do not exist", async () => {
      const m1 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/a.jpg",
      });

      await expect(
        mediaService.validateIds([m1.id, "nonexistent-id"]),
      ).rejects.toThrow("invalid media IDs");
    });

    it("throws ValidationError for all nonexistent IDs", async () => {
      await expect(
        mediaService.validateIds(["fake-1", "fake-2"]),
      ).rejects.toThrow("invalid media IDs");
    });
  });

  describe("getByStorageKey", () => {
    it("returns media by R2 key", async () => {
      await mediaService.create(sampleMedia);

      const found = await mediaService.getByStorageKey(
        "media/0192a9f1-a2b7-7c3d-8e4f-5a6b7c8d9e0f.jpg",
        "r2",
      );
      expect(found).not.toBeNull();
      expect(found?.originalName).toBe("photo.jpg");
    });

    it("returns null for non-existent R2 key", async () => {
      const found = await mediaService.getByStorageKey("nonexistent", "r2");
      expect(found).toBeNull();
    });

    it("allows the same storage key on different providers", async () => {
      await mediaService.create(sampleMedia);
      await mediaService.create({
        ...sampleMedia,
        id: "0192a9f1-a2b7-7c3d-8e4f-5a6b7c8d9e10",
        provider: "s3",
      });

      const r2Media = await mediaService.getByStorageKey(
        sampleMedia.storageKey,
        "r2",
      );
      const s3Media = await mediaService.getByStorageKey(
        sampleMedia.storageKey,
        "s3",
      );

      expect(r2Media?.provider).toBe("r2");
      expect(s3Media?.provider).toBe("s3");
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

      const list = await mediaService.list({ limit: 2 });
      expect(list).toHaveLength(2);
    });
  });

  describe("attachToPost", () => {
    it("sets postId and position for each media", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
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
      expect(attached[0]!.position).toBe("a0");
      expect(attached[1]!.id).toBe(m2.id);
      expect(attached[1]!.position).toBe("a1");
    });

    it("replaces existing attachments", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
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
      expect(attached[0]!.position).toBe("a0");

      // Verify old media is detached
      const old1 = await mediaService.getById(m1.id);
      expect(old1!.postId).toBeNull();
      expect(old1!.position).toBe("a0");
    });

    it("handles empty array by clearing all attachments", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
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

    it("does not call transaction() when reordering attachments on sqlite-family backends", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
      });

      const m1 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/sqlite-a.jpg",
      });
      const m2 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/sqlite-b.jpg",
      });

      const dbWithoutTransaction = db as Database & {
        transaction: () => Promise<never>;
      };
      const originalTransaction = dbWithoutTransaction.transaction.bind(db);
      dbWithoutTransaction.transaction = async () => {
        throw new Error("sqlite attachToPost() should not call transaction()");
      };

      try {
        await expect(
          mediaService.attachToPost(post.id, [m1.id, m2.id]),
        ).resolves.toBeUndefined();
      } finally {
        dbWithoutTransaction.transaction = originalTransaction;
      }
    });
  });

  describe("detachFromPost", () => {
    it("clears postId and resets position", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
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
      expect(detached!.position).toBe("a0");
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

    it("deletes poster from storage when posterKey exists", async () => {
      const media = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/vid.mp4",
        posterKey: "media/vid.poster.webp",
      });

      const deletedKeys: string[] = [];
      const mockStorage = {
        delete: async (key: string) => {
          deletedKeys.push(key);
        },
        put: async () => {},
        get: async () => null,
      };

      await mediaService.delete(media.id, mockStorage as never);
      expect(deletedKeys).toContain("media/vid.mp4");
      expect(deletedKeys).toContain("media/vid.poster.webp");
    });
  });

  describe("deleteByIds", () => {
    it("deletes multiple media records", async () => {
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

      await mediaService.deleteByIds([m1.id, m2.id]);

      expect(await mediaService.getById(m1.id)).toBeNull();
      expect(await mediaService.getById(m2.id)).toBeNull();
      expect(await mediaService.getById(m3.id)).not.toBeNull();
    });

    it("handles empty array gracefully", async () => {
      const m1 = await mediaService.create(sampleMedia);

      await mediaService.deleteByIds([]);

      expect(await mediaService.getById(m1.id)).not.toBeNull();
    });

    it("deletes poster keys from storage", async () => {
      const m1 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/a.mp4",
        posterKey: "media/a-poster.webp",
      });
      const m2 = await mediaService.create({
        ...sampleMedia,
        storageKey: "media/b.jpg",
      });

      const deletedKeys: string[] = [];
      const mockStorage = {
        delete: async (key: string) => {
          deletedKeys.push(key);
        },
        put: async () => {},
        get: async () => null,
      };

      await mediaService.deleteByIds([m1.id, m2.id], mockStorage as never);
      expect(deletedKeys).toContain("media/a.mp4");
      expect(deletedKeys).toContain("media/a-poster.webp");
      expect(deletedKeys).toContain("media/b.jpg");
      expect(deletedKeys).toHaveLength(3);
    });
  });
});
