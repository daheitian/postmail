import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createNavItemService } from "../navigation.js";
import type { Database } from "../../db/index.js";

describe("NavItemService", () => {
  let db: Database;
  let navItemService: ReturnType<typeof createNavItemService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    navItemService = createNavItemService(db);
  });

  describe("create", () => {
    it("creates a nav item with auto-assigned position", async () => {
      const item = await navItemService.create({
        type: "link",
        label: "Home",
        url: "/",
      });

      expect(item.type).toBe("link");
      expect(item.label).toBe("Home");
      expect(item.url).toBe("/");
      expect(item.position).toBe(0);
      expect(typeof item.id).toBe("string");
      expect(item.id.length).toBeGreaterThan(0);
    });

    it("auto-increments position for subsequent items", async () => {
      await navItemService.create({
        type: "link",
        label: "Home",
        url: "/",
      });
      const second = await navItemService.create({
        type: "link",
        label: "Archive",
        url: "/archive",
      });

      expect(second.position).toBe(1);
    });

    it("uses provided position when specified", async () => {
      const item = await navItemService.create({
        type: "link",
        label: "Home",
        url: "/",
        position: 5,
      });

      expect(item.position).toBe(5);
    });

    it("sets createdAt and updatedAt timestamps", async () => {
      const item = await navItemService.create({
        type: "link",
        label: "Home",
        url: "/",
      });

      expect(item.createdAt).toBeGreaterThan(0);
      expect(item.updatedAt).toBeGreaterThan(0);
      expect(item.createdAt).toBe(item.updatedAt);
    });
  });

  describe("getById", () => {
    it("returns a nav item by ID", async () => {
      const created = await navItemService.create({
        type: "link",
        label: "Home",
        url: "/",
      });

      const found = await navItemService.getById(created.id);
      expect(found).not.toBeNull();
      expect(found?.label).toBe("Home");
      expect(found?.type).toBe("link");
    });

    it("returns null for non-existent ID", async () => {
      const found = await navItemService.getById(
        "00000000-0000-0000-0000-000000009999",
      );
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns empty array when no items exist", async () => {
      const items = await navItemService.list();
      expect(items).toEqual([]);
    });

    it("returns items ordered by position", async () => {
      await navItemService.create({
        type: "link",
        label: "C",
        url: "/c",
        position: 2,
      });
      await navItemService.create({
        type: "link",
        label: "A",
        url: "/a",
        position: 0,
      });
      await navItemService.create({
        type: "link",
        label: "B",
        url: "/b",
        position: 1,
      });

      const items = await navItemService.list();
      expect(items).toHaveLength(3);
      expect(items[0]?.label).toBe("A");
      expect(items[1]?.label).toBe("B");
      expect(items[2]?.label).toBe("C");
    });

    it("returns items with correct types", async () => {
      await navItemService.create({
        type: "link",
        label: "External",
        url: "https://example.com",
      });
      await navItemService.create({
        type: "system",
        label: "Settings",
        url: "/settings",
      });

      const items = await navItemService.list();
      expect(items).toHaveLength(2);
      expect(items[0]?.type).toBe("link");
      expect(items[1]?.type).toBe("system");
    });
  });

  describe("update", () => {
    it("updates a nav item's label", async () => {
      const created = await navItemService.create({
        type: "link",
        label: "Home",
        url: "/",
      });

      const updated = await navItemService.update(created.id, {
        label: "Main Page",
      });

      expect(updated?.label).toBe("Main Page");
      expect(updated?.url).toBe("/");
      expect(updated?.type).toBe("link");
    });

    it("updates a nav item's url", async () => {
      const created = await navItemService.create({
        type: "link",
        label: "Blog",
        url: "/blog",
      });

      const updated = await navItemService.update(created.id, {
        url: "/posts",
      });

      expect(updated?.url).toBe("/posts");
      expect(updated?.label).toBe("Blog");
    });

    it("updates updatedAt timestamp", async () => {
      const created = await navItemService.create({
        type: "link",
        label: "Home",
        url: "/",
      });

      const updated = await navItemService.update(created.id, {
        label: "Updated",
      });

      expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    });

    it("returns null for non-existent ID", async () => {
      const result = await navItemService.update(
        "00000000-0000-0000-0000-000000009999",
        { label: "Nope" },
      );
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("deletes a nav item by ID", async () => {
      const item = await navItemService.create({
        type: "link",
        label: "Home",
        url: "/",
      });
      const result = await navItemService.delete(item.id);

      expect(result).toBe(true);

      const found = await navItemService.getById(item.id);
      expect(found).toBeNull();
    });

    it("returns false for non-existent ID", async () => {
      const result = await navItemService.delete(
        "00000000-0000-0000-0000-000000009999",
      );
      expect(result).toBe(false);
    });
  });

  describe("reorder", () => {
    it("updates positions to match array order", async () => {
      const a = await navItemService.create({
        type: "link",
        label: "A",
        url: "/a",
      });
      const b = await navItemService.create({
        type: "link",
        label: "B",
        url: "/b",
      });
      const c = await navItemService.create({
        type: "link",
        label: "C",
        url: "/c",
      });

      // Reverse the order
      await navItemService.reorder([c.id, b.id, a.id]);

      const items = await navItemService.list();
      expect(items[0]?.label).toBe("C");
      expect(items[0]?.position).toBe(0);
      expect(items[1]?.label).toBe("B");
      expect(items[1]?.position).toBe(1);
      expect(items[2]?.label).toBe("A");
      expect(items[2]?.position).toBe(2);
    });
  });
});
