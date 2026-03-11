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
      expect(typeof item.position).toBe("string");
      expect(typeof item.id).toBe("string");
      expect(item.id.length).toBeGreaterThan(0);
    });

    it("auto-increments position for subsequent items", async () => {
      const first = await navItemService.create({
        type: "link",
        label: "Home",
        url: "/",
      });
      const second = await navItemService.create({
        type: "link",
        label: "Archive",
        url: "/archive",
      });

      expect(second.position > first.position).toBe(true);
    });

    it("uses provided position when specified", async () => {
      const item = await navItemService.create({
        type: "link",
        label: "Home",
        url: "/",
        position: "z99",
      });

      expect(item.position).toBe("z99");
    });

    it("rejects duplicate provided positions", async () => {
      await navItemService.create({
        type: "link",
        label: "Home",
        url: "/",
        position: "m0",
      });

      await expect(
        navItemService.create({
          type: "link",
          label: "Archive",
          url: "/archive",
          position: "m0",
        }),
      ).rejects.toThrow();
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
        position: "c0",
      });
      await navItemService.create({
        type: "link",
        label: "A",
        url: "/a",
        position: "a0",
      });
      await navItemService.create({
        type: "link",
        label: "B",
        url: "/b",
        position: "b0",
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

  describe("move", () => {
    it("moves an item between two others", async () => {
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

      // Move C between A and B
      await navItemService.move(c.id, a.id, b.id);

      const items = await navItemService.list();
      expect(items[0]?.label).toBe("A");
      expect(items[1]?.label).toBe("C");
      expect(items[2]?.label).toBe("B");
    });

    it("moves an item to the beginning", async () => {
      const a = await navItemService.create({
        type: "link",
        label: "A",
        url: "/a",
      });
      await navItemService.create({
        type: "link",
        label: "B",
        url: "/b",
      });
      const c = await navItemService.create({
        type: "link",
        label: "C",
        url: "/c",
      });

      // Move C before A
      await navItemService.move(c.id, null, a.id);

      const items = await navItemService.list();
      expect(items[0]?.label).toBe("C");
      expect(items[1]?.label).toBe("A");
      expect(items[2]?.label).toBe("B");
    });

    it("moves an item to the end", async () => {
      const a = await navItemService.create({
        type: "link",
        label: "A",
        url: "/a",
      });
      await navItemService.create({
        type: "link",
        label: "B",
        url: "/b",
      });
      const c = await navItemService.create({
        type: "link",
        label: "C",
        url: "/c",
      });

      // Move A after C
      await navItemService.move(a.id, c.id, null);

      const items = await navItemService.list();
      expect(items[0]?.label).toBe("B");
      expect(items[1]?.label).toBe("C");
      expect(items[2]?.label).toBe("A");
    });

    it("returns null for non-existent item", async () => {
      const result = await navItemService.move(
        "00000000-0000-0000-0000-000000009999",
        null,
        null,
      );
      expect(result).toBeNull();
    });
  });
});
