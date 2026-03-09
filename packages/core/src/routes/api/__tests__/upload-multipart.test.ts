import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Bindings } from "../../../types.js";
import type { AppVariables } from "../../../types/app-context.js";
import { createTestDatabase } from "../../../__tests__/helpers/db.js";
import { createMediaService } from "../../../services/media.js";
import { createSettingsService } from "../../../services/settings.js";
import { createPostService } from "../../../services/post.js";
import { createCustomUrlService } from "../../../services/custom-url.js";
import { createCollectionService } from "../../../services/collection.js";
import { createSearchService } from "../../../services/search.js";
import { createNavItemService } from "../../../services/navigation.js";
import { createAuthService } from "../../../services/auth.js";
import { errorHandler } from "../../../middleware/error-handler.js";
import { createI18n } from "../../../i18n/i18n.js";
import { resolveConfig } from "../../../lib/resolve-config.js";
import type { Database } from "../../../db/index.js";
import type { StorageDriver, UploadedPart } from "../../../lib/storage.js";
import { multipartUploadApiRoutes } from "../upload-multipart.js";
import type BetterSqlite3 from "better-sqlite3";

type Env = { Bindings: Bindings; Variables: AppVariables };

/** Creates a mock storage driver that supports multipart uploads */
function createMockMultipartStorage(): StorageDriver & {
  uploads: Map<string, { key: string; parts: Map<number, ArrayBuffer> }>;
  completed: Map<string, UploadedPart[]>;
  aborted: Set<string>;
  files: Map<string, { body: Uint8Array; contentType?: string }>;
} {
  const uploads = new Map<
    string,
    { key: string; parts: Map<number, ArrayBuffer> }
  >();
  const completed = new Map<string, UploadedPart[]>();
  const aborted = new Set<string>();
  const files = new Map<string, { body: Uint8Array; contentType?: string }>();
  let uploadCounter = 0;

  return {
    uploads,
    completed,
    aborted,
    files,

    async put(key, body, opts) {
      let bytes: Uint8Array;
      if (body instanceof Uint8Array) {
        bytes = body;
      } else {
        const reader = body.getReader();
        const chunks: Uint8Array[] = [];
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        let totalLength = 0;
        for (const chunk of chunks) totalLength += chunk.length;
        bytes = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
      }
      files.set(key, { body: bytes, contentType: opts?.contentType });
    },

    async get(key) {
      const file = files.get(key);
      if (!file) return null;
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(file.body);
          controller.close();
        },
      });
      return { body: stream, contentType: file.contentType };
    },

    async delete(key) {
      files.delete(key);
    },

    async createMultipartUpload(key, _opts) {
      const uploadId = `upload-${++uploadCounter}`;
      uploads.set(uploadId, { key, parts: new Map() });
      return { uploadId, key };
    },

    async uploadPart(key, uploadId, partNumber, body) {
      const upload = uploads.get(uploadId);
      if (!upload) throw new Error(`No upload with id ${uploadId}`);
      const buffer =
        body instanceof ArrayBuffer
          ? body
          : body instanceof Uint8Array
            ? body.buffer.slice(
                body.byteOffset,
                body.byteOffset + body.byteLength,
              )
            : await new Response(body as ReadableStream).arrayBuffer();
      upload.parts.set(partNumber, buffer);
      const etag = `etag-${key}-${partNumber}`;
      return { partNumber, etag };
    },

    async completeMultipartUpload(_key, uploadId, parts) {
      completed.set(uploadId, parts);
      uploads.delete(uploadId);
    },

    async abortMultipartUpload(_key, uploadId) {
      aborted.add(uploadId);
      uploads.delete(uploadId);
    },
  };
}

function createMockD1(sqliteDb: BetterSqlite3.Database) {
  return {
    prepare(query: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async all<T>() {
              const stmt = sqliteDb.prepare(query);
              const rows = stmt.all(...(params as never[])) as T[];
              return { results: rows };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

function createTestAppWithStorage(options: {
  authenticated?: boolean;
  storage: StorageDriver | null;
}) {
  const testDb = createTestDatabase();
  const db = testDb.db as unknown as Database;
  const sqlite = testDb.sqlite;
  const mockD1 = createMockD1(sqlite);

  const settingsService = createSettingsService(db);
  const services = {
    posts: createPostService(db, { slugIdLength: 5 }),
    settings: settingsService,
    customUrls: createCustomUrlService(db),
    media: createMediaService(db),
    collections: createCollectionService(db),
    search: createSearchService(mockD1),
    navItems: createNavItemService(db),
    auth: createAuthService(db, settingsService),
  };

  const app = new Hono<Env>();
  app.onError(errorHandler);

  app.use("*", async (c, next) => {
    c.env = {
      SITE_URL: "http://localhost:9020",
    } as AppVariables["services"] extends never ? never : Bindings;

    c.set("services", services as AppVariables["services"]);
    const allSettings = await services.settings.getAll();
    c.set("allSettings", allSettings);
    c.set("appConfig", resolveConfig(c.env, allSettings));
    c.set("storage", options.storage);

    const i18n = createI18n("en");
    c.set("lang", "en");
    c.set("i18n", i18n);

    if (options.authenticated) {
      c.set("auth", {
        api: {
          getSession: async () => ({
            user: { id: "test-user", email: "test@test.com", name: "Test" },
            session: { id: "test-session" },
          }),
        },
      } as AppVariables["auth"]);
    } else {
      c.set("auth", {
        api: {
          getSession: async () => null,
        },
      } as AppVariables["auth"]);
    }

    await next();
  });

  return { app, services, db, sqlite };
}

describe("multipart upload API routes", () => {
  describe("auth", () => {
    it("returns 401 when not authenticated", async () => {
      const { app } = createTestAppWithStorage({
        authenticated: false,
        storage: createMockMultipartStorage(),
      });
      app.route("/api/upload/multipart", multipartUploadApiRoutes);

      const res = await app.request("/api/upload/multipart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "test.mp4",
          contentType: "video/mp4",
          size: 100_000_000,
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("storage support", () => {
    it("returns 500 when storage is null", async () => {
      const { app } = createTestAppWithStorage({
        authenticated: true,
        storage: null,
      });
      app.route("/api/upload/multipart", multipartUploadApiRoutes);

      const res = await app.request("/api/upload/multipart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "test.mp4",
          contentType: "video/mp4",
          size: 100_000_000,
        }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain("multipart");
    });

    it("returns 500 when storage lacks multipart methods", async () => {
      const basicStorage: StorageDriver = {
        async put() {},
        async get() {
          return null;
        },
        async delete() {},
      };
      const { app } = createTestAppWithStorage({
        authenticated: true,
        storage: basicStorage,
      });
      app.route("/api/upload/multipart", multipartUploadApiRoutes);

      const res = await app.request("/api/upload/multipart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "test.mp4",
          contentType: "video/mp4",
          size: 100_000_000,
        }),
      });

      expect(res.status).toBe(500);
    });
  });

  describe("initiate", () => {
    it("accepts any file type", async () => {
      const { app } = createTestAppWithStorage({
        authenticated: true,
        storage: createMockMultipartStorage(),
      });
      app.route("/api/upload/multipart", multipartUploadApiRoutes);

      const res = await app.request("/api/upload/multipart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "file.exe",
          contentType: "application/x-msdownload",
          size: 100_000_000,
        }),
      });

      expect(res.status).toBe(200);
    });

    it("returns id, uploadId, storageKey, filename on success", async () => {
      const { app } = createTestAppWithStorage({
        authenticated: true,
        storage: createMockMultipartStorage(),
      });
      app.route("/api/upload/multipart", multipartUploadApiRoutes);

      const res = await app.request("/api/upload/multipart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "big-video.mp4",
          contentType: "video/mp4",
          size: 100_000_000,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.uploadId).toBeDefined();
      expect(data.storageKey).toContain("media/");
      expect(data.filename).toBeDefined();
      expect(data.originalName).toBe("big-video.mp4");
    });
  });

  describe("full flow", () => {
    let app: ReturnType<typeof createTestAppWithStorage>["app"];
    let services: ReturnType<typeof createTestAppWithStorage>["services"];
    let storage: ReturnType<typeof createMockMultipartStorage>;

    beforeEach(() => {
      storage = createMockMultipartStorage();
      const result = createTestAppWithStorage({
        authenticated: true,
        storage,
      });
      app = result.app;
      services = result.services;
      app.route("/api/upload/multipart", multipartUploadApiRoutes);
    });

    it("initiate → upload part → complete creates a DB record", async () => {
      // Initiate
      const initRes = await app.request("/api/upload/multipart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "large-file.mp4",
          contentType: "video/mp4",
          size: 100_000_000,
        }),
      });
      expect(initRes.status).toBe(200);
      const { id, uploadId, storageKey, filename, originalName } =
        (await initRes.json()) as {
          id: string;
          uploadId: string;
          storageKey: string;
          filename: string;
          originalName: string;
        };

      // Upload a part
      const partBody = new Uint8Array(1024).fill(0xaa);
      const partRes = await app.request(
        `/api/upload/multipart/${id}/part?partNumber=1&storageKey=${encodeURIComponent(storageKey)}&uploadId=${encodeURIComponent(uploadId)}`,
        {
          method: "PUT",
          body: partBody,
        },
      );
      expect(partRes.status).toBe(200);
      const partData = (await partRes.json()) as {
        partNumber: number;
        etag: string;
      };
      expect(partData.partNumber).toBe(1);
      expect(partData.etag).toBeDefined();

      // Complete
      const completeRes = await app.request(
        `/api/upload/multipart/${id}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storageKey,
            uploadId,
            parts: [{ partNumber: partData.partNumber, etag: partData.etag }],
            filename,
            originalName,
            contentType: "video/mp4",
            size: 100_000_000,
            width: 1920,
            height: 1080,
          }),
        },
      );
      expect(completeRes.status).toBe(200);
      const result = (await completeRes.json()) as {
        id: string;
        filename: string;
        mimeType: string;
        size: number;
      };
      expect(result.id).toBe(id);
      expect(result.mimeType).toBe("video/mp4");
      expect(result.size).toBe(100_000_000);

      // Verify DB record
      const media = await services.media.getById(id);
      expect(media).toMatchObject({
        mimeType: "video/mp4",
        width: 1920,
        height: 1080,
      });
    });

    it("abort cleans up R2", async () => {
      // Initiate
      const initRes = await app.request("/api/upload/multipart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "cancelled.mp4",
          contentType: "video/mp4",
          size: 200_000_000,
        }),
      });
      const { uploadId, storageKey } = (await initRes.json()) as {
        id: string;
        uploadId: string;
        storageKey: string;
      };

      // Abort
      const abortRes = await app.request(`/api/upload/multipart/unused/abort`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey, uploadId }),
      });
      expect(abortRes.status).toBe(200);

      // Verify R2 abort was called
      expect(storage.aborted.size).toBe(1);
    });

    it("returns 400 for part upload with missing storageKey/uploadId", async () => {
      const res = await app.request(
        "/api/upload/multipart/some-id/part?partNumber=1",
        {
          method: "PUT",
          body: new Uint8Array(10),
        },
      );
      expect(res.status).toBe(400);
    });

    it("poster upload returns posterKey", async () => {
      // Initiate
      const initRes = await app.request("/api/upload/multipart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "video-with-poster.mp4",
          contentType: "video/mp4",
          size: 100_000_000,
        }),
      });
      const { id, uploadId, storageKey, filename, originalName } =
        (await initRes.json()) as {
          id: string;
          uploadId: string;
          storageKey: string;
          filename: string;
          originalName: string;
        };

      // Upload poster
      const posterBlob = new Blob([new Uint8Array(100)], {
        type: "image/webp",
      });
      const formData = new FormData();
      formData.append("poster", posterBlob, "poster.webp");

      const posterRes = await app.request(
        `/api/upload/multipart/${id}/poster`,
        {
          method: "PUT",
          body: formData,
        },
      );
      expect(posterRes.status).toBe(200);
      const posterData = (await posterRes.json()) as { posterKey: string };
      expect(posterData.posterKey).toContain("poster.webp");

      // Verify poster was stored
      expect(storage.files.has(posterData.posterKey)).toBe(true);

      // Upload a part and complete to verify posterKey is in the DB record
      const partRes = await app.request(
        `/api/upload/multipart/${id}/part?partNumber=1&storageKey=${encodeURIComponent(storageKey)}&uploadId=${encodeURIComponent(uploadId)}`,
        {
          method: "PUT",
          body: new Uint8Array(1024),
        },
      );
      const partData = (await partRes.json()) as {
        partNumber: number;
        etag: string;
      };

      await app.request(`/api/upload/multipart/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey,
          uploadId,
          parts: [{ partNumber: partData.partNumber, etag: partData.etag }],
          filename,
          originalName,
          contentType: "video/mp4",
          size: 100_000_000,
          posterKey: posterData.posterKey,
        }),
      });

      const media = await services.media.getById(id);
      expect(media).not.toBeNull();
      expect(media).toHaveProperty("posterKey");
      expect(String(media?.posterKey)).toContain("poster.webp");
    });
  });
});
