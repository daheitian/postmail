import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createPathRegistryService } from "../path-registry.js";
import { ValidationError, ConflictError } from "../../lib/errors.js";
import type { Database } from "../../db/index.js";

describe("PathRegistryService", () => {
  let db: Database;
  let pathRegistry: ReturnType<typeof createPathRegistryService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    pathRegistry = createPathRegistryService(db);
  });

  describe("claim", () => {
    it("claims a path successfully", async () => {
      const entry = await pathRegistry.claim("about", "page", "uuid-page-1");

      expect(entry.path).toBe("about");
      expect(entry.ownerType).toBe("page");
      expect(entry.ownerId).toBe("uuid-page-1");
      expect(entry.createdAt).toBeGreaterThan(0);
    });

    it("normalizes the path before claiming", async () => {
      const entry = await pathRegistry.claim(
        "  /About/  ",
        "page",
        "uuid-page-1",
      );
      expect(entry.path).toBe("about");
    });

    it("rejects reserved paths", async () => {
      await expect(
        pathRegistry.claim("dash", "page", "uuid-page-1"),
      ).rejects.toThrow(ValidationError);
      await expect(
        pathRegistry.claim("api", "page", "uuid-page-1"),
      ).rejects.toThrow(ValidationError);
      await expect(
        pathRegistry.claim("search", "page", "uuid-page-1"),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects reserved paths regardless of casing", async () => {
      await expect(
        pathRegistry.claim("DASH", "page", "uuid-page-1"),
      ).rejects.toThrow(ValidationError);
    });

    it("throws ConflictError when path is already claimed by another entity", async () => {
      await pathRegistry.claim("about", "page", "uuid-page-1");

      await expect(
        pathRegistry.claim("about", "post", "uuid-post-2"),
      ).rejects.toThrow(ConflictError);
    });

    it("is idempotent for the same owner", async () => {
      const first = await pathRegistry.claim("about", "page", "uuid-page-1");
      const second = await pathRegistry.claim("about", "page", "uuid-page-1");

      expect(second.path).toBe(first.path);
      expect(second.ownerType).toBe(first.ownerType);
      expect(second.ownerId).toBe(first.ownerId);
    });

    it("allows multi-level paths", async () => {
      const entry = await pathRegistry.claim(
        "2024/01/my-post",
        "post",
        "uuid-post-1",
      );
      expect(entry.path).toBe("2024/01/my-post");
    });
  });

  describe("release", () => {
    it("releases a claimed path", async () => {
      await pathRegistry.claim("about", "page", "uuid-page-1");
      await pathRegistry.release("about");

      const entry = await pathRegistry.getByPath("about");
      expect(entry).toBeNull();
    });

    it("normalizes the path before releasing", async () => {
      await pathRegistry.claim("about", "page", "uuid-page-1");
      await pathRegistry.release("  /About/  ");

      const entry = await pathRegistry.getByPath("about");
      expect(entry).toBeNull();
    });

    it("is a no-op for unclaimed paths", async () => {
      // Should not throw
      await pathRegistry.release("nonexistent");
    });
  });

  describe("releaseByOwner", () => {
    it("releases all paths for a specific owner", async () => {
      await pathRegistry.claim("about", "page", "uuid-page-1");
      await pathRegistry.claim("contact", "page", "uuid-page-1");
      await pathRegistry.claim("blog", "page", "uuid-page-2");

      await pathRegistry.releaseByOwner("page", "uuid-page-1");

      expect(await pathRegistry.getByPath("about")).toBeNull();
      expect(await pathRegistry.getByPath("contact")).toBeNull();
      // Different owner's path should remain
      expect(await pathRegistry.getByPath("blog")).not.toBeNull();
    });

    it("does not affect other owner types", async () => {
      await pathRegistry.claim("about", "page", "uuid-page-1");
      await pathRegistry.claim("my-post", "post", "uuid-post-1");

      await pathRegistry.releaseByOwner("page", "uuid-page-1");

      expect(await pathRegistry.getByPath("about")).toBeNull();
      expect(await pathRegistry.getByPath("my-post")).not.toBeNull();
    });
  });

  describe("getByPath", () => {
    it("returns entry for claimed path", async () => {
      await pathRegistry.claim("about", "page", "uuid-page-1");

      const entry = await pathRegistry.getByPath("about");
      expect(entry).not.toBeNull();
      expect(entry?.ownerType).toBe("page");
      expect(entry?.ownerId).toBe("uuid-page-1");
    });

    it("normalizes the lookup path", async () => {
      await pathRegistry.claim("about", "page", "uuid-page-1");

      const entry = await pathRegistry.getByPath("  /About/  ");
      expect(entry).not.toBeNull();
    });

    it("returns null for unclaimed path", async () => {
      const entry = await pathRegistry.getByPath("nonexistent");
      expect(entry).toBeNull();
    });
  });

  describe("isAvailable", () => {
    it("returns true for unclaimed, non-reserved paths", async () => {
      expect(await pathRegistry.isAvailable("about")).toBe(true);
    });

    it("returns false for reserved paths", async () => {
      expect(await pathRegistry.isAvailable("dash")).toBe(false);
      expect(await pathRegistry.isAvailable("api")).toBe(false);
    });

    it("returns false for claimed paths", async () => {
      await pathRegistry.claim("about", "page", "uuid-page-1");
      expect(await pathRegistry.isAvailable("about")).toBe(false);
    });

    it("returns true after a path is released", async () => {
      await pathRegistry.claim("about", "page", "uuid-page-1");
      await pathRegistry.release("about");
      expect(await pathRegistry.isAvailable("about")).toBe(true);
    });
  });
});
