import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createRedirectService } from "../redirect.js";
import { createPageService } from "../page.js";
import { createPostService } from "../post.js";
import { createPathRegistryService } from "../path-registry.js";
import { ConflictError } from "../../lib/errors.js";
import type { Database } from "../../db/index.js";

describe("RedirectService", () => {
  let db: Database;
  let redirectService: ReturnType<typeof createRedirectService>;
  let pageService: ReturnType<typeof createPageService>;
  let postService: ReturnType<typeof createPostService>;
  let pathRegistry: ReturnType<typeof createPathRegistryService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    pathRegistry = createPathRegistryService(db);
    redirectService = createRedirectService(db, pathRegistry);
    pageService = createPageService(db, pathRegistry);
    postService = createPostService(db, pathRegistry);
  });

  describe("create", () => {
    it("creates a 301 redirect by default", async () => {
      const redirect = await redirectService.create("/old-path", "/new-path");

      expect(redirect.fromPath).toBe("old-path"); // normalizePath removes leading slash
      expect(redirect.toPath).toBe("/new-path");
      expect(redirect.type).toBe(301);
      expect(typeof redirect.id).toBe("string");
      expect(redirect.id.length).toBeGreaterThan(0);
    });

    it("creates a 302 redirect", async () => {
      const redirect = await redirectService.create(
        "/temp",
        "/destination",
        302,
      );

      expect(redirect.type).toBe(302);
    });

    it("normalizes from path", async () => {
      const redirect = await redirectService.create(
        "  /OLD-PATH/  ",
        "/new-path",
      );

      expect(redirect.fromPath).toBe("old-path");
    });

    it("replaces existing redirect for same from path", async () => {
      await redirectService.create("/old", "/first");
      const second = await redirectService.create("/old", "/second");

      expect(second.toPath).toBe("/second");

      const list = await redirectService.list();
      expect(list).toHaveLength(1);
    });
  });

  describe("getByPath", () => {
    it("finds redirect by from path", async () => {
      await redirectService.create("/old-page", "/new-page");

      const found = await redirectService.getByPath("/old-page");
      expect(found).not.toBeNull();
      expect(found?.toPath).toBe("/new-page");
    });

    it("normalizes the lookup path", async () => {
      await redirectService.create("/old-page", "/new-page");

      const found = await redirectService.getByPath("  /OLD-PAGE/  ");
      expect(found).not.toBeNull();
    });

    it("returns null for non-existent path", async () => {
      const found = await redirectService.getByPath("/nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("delete", () => {
    it("deletes a redirect by ID", async () => {
      const redirect = await redirectService.create("/old", "/new");
      const result = await redirectService.delete(redirect.id);

      expect(result).toBe(true);

      const found = await redirectService.getByPath("/old");
      expect(found).toBeNull();
    });

    it("returns false for non-existent ID", async () => {
      const result = await redirectService.delete(
        "00000000-0000-0000-0000-000000009999",
      );
      expect(result).toBe(false);
    });
  });

  describe("list", () => {
    it("returns empty array when no redirects exist", async () => {
      const redirects = await redirectService.list();
      expect(redirects).toEqual([]);
    });

    it("returns all redirects", async () => {
      await redirectService.create("/old-a", "/new-a");
      await redirectService.create("/old-b", "/new-b");
      await redirectService.create("/old-c", "/new-c");

      const redirects = await redirectService.list();
      expect(redirects).toHaveLength(3);
    });
  });

  describe("path registry integration", () => {
    it("rejects redirect that conflicts with a page", async () => {
      await pageService.create({ slug: "about", title: "About" });

      await expect(
        redirectService.create("/about", "/new-about"),
      ).rejects.toThrow(ConflictError);
    });

    it("rejects redirect that conflicts with a post path", async () => {
      await postService.create({
        format: "note",
        body: "test",
        path: "my-post",
      });

      await expect(
        redirectService.create("/my-post", "/elsewhere"),
      ).rejects.toThrow(ConflictError);
    });

    it("allows upsert for existing redirect (same type)", async () => {
      await redirectService.create("/old", "/first");
      const second = await redirectService.create("/old", "/second");

      expect(second.toPath).toBe("/second");

      const list = await redirectService.list();
      expect(list).toHaveLength(1);
    });

    it("releases path on delete", async () => {
      const redirect = await redirectService.create("/old", "/new");
      await redirectService.delete(redirect.id);

      expect(await pathRegistry.isAvailable("old")).toBe(true);
    });
  });
});
