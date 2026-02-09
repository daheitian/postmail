import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createRedirectService } from "../redirect.js";
import type { Database } from "../../db/index.js";

describe("RedirectService", () => {
  let db: Database;
  let redirectService: ReturnType<typeof createRedirectService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    redirectService = createRedirectService(db);
  });

  describe("create", () => {
    it("creates a 301 redirect by default", async () => {
      const redirect = await redirectService.create("/old-path", "/new-path");

      expect(redirect.fromPath).toBe("old-path"); // normalizePath removes leading slash
      expect(redirect.toPath).toBe("/new-path");
      expect(redirect.type).toBe(301);
      expect(redirect.id).toBe(1);
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
      const result = await redirectService.delete(9999);
      expect(result).toBe(false);
    });
  });

  describe("list", () => {
    it("returns empty array when no redirects exist", async () => {
      const redirects = await redirectService.list();
      expect(redirects).toEqual([]);
    });

    it("returns all redirects", async () => {
      await redirectService.create("/a", "/b");
      await redirectService.create("/c", "/d");
      await redirectService.create("/e", "/f");

      const redirects = await redirectService.list();
      expect(redirects).toHaveLength(3);
    });
  });
});
