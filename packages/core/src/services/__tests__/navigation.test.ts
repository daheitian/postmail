import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createNavigationLinkService } from "../navigation.js";
import type { Database } from "../../db/index.js";

describe("NavigationLinkService", () => {
  let db: Database;
  let navigationService: ReturnType<typeof createNavigationLinkService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    navigationService = createNavigationLinkService(db);
  });

  describe("create", () => {
    it("creates a navigation link with auto-assigned position", async () => {
      const link = await navigationService.create({
        label: "Home",
        url: "/",
      });

      expect(link.label).toBe("Home");
      expect(link.url).toBe("/");
      expect(link.position).toBe(0);
      expect(link.id).toBe(1);
    });

    it("auto-increments position for subsequent links", async () => {
      await navigationService.create({ label: "Home", url: "/" });
      const second = await navigationService.create({
        label: "Archive",
        url: "/archive",
      });

      expect(second.position).toBe(1);
    });

    it("uses provided position when specified", async () => {
      const link = await navigationService.create({
        label: "Home",
        url: "/",
        position: 5,
      });

      expect(link.position).toBe(5);
    });
  });

  describe("getById", () => {
    it("returns a link by ID", async () => {
      const created = await navigationService.create({
        label: "Home",
        url: "/",
      });

      const found = await navigationService.getById(created.id);
      expect(found).not.toBeNull();
      expect(found?.label).toBe("Home");
    });

    it("returns null for non-existent ID", async () => {
      const found = await navigationService.getById(9999);
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns empty array when no links exist", async () => {
      const links = await navigationService.list();
      expect(links).toEqual([]);
    });

    it("returns links ordered by position", async () => {
      await navigationService.create({
        label: "C",
        url: "/c",
        position: 2,
      });
      await navigationService.create({
        label: "A",
        url: "/a",
        position: 0,
      });
      await navigationService.create({
        label: "B",
        url: "/b",
        position: 1,
      });

      const links = await navigationService.list();
      expect(links).toHaveLength(3);
      expect(links[0]?.label).toBe("A");
      expect(links[1]?.label).toBe("B");
      expect(links[2]?.label).toBe("C");
    });
  });

  describe("update", () => {
    it("updates a link's label", async () => {
      const created = await navigationService.create({
        label: "Home",
        url: "/",
      });

      const updated = await navigationService.update(created.id, {
        label: "Main Page",
      });

      expect(updated?.label).toBe("Main Page");
      expect(updated?.url).toBe("/");
    });

    it("updates a link's url", async () => {
      const created = await navigationService.create({
        label: "Blog",
        url: "/blog",
      });

      const updated = await navigationService.update(created.id, {
        url: "/posts",
      });

      expect(updated?.url).toBe("/posts");
      expect(updated?.label).toBe("Blog");
    });

    it("returns null for non-existent ID", async () => {
      const result = await navigationService.update(9999, { label: "Nope" });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("deletes a link by ID", async () => {
      const link = await navigationService.create({
        label: "Home",
        url: "/",
      });
      const result = await navigationService.delete(link.id);

      expect(result).toBe(true);

      const found = await navigationService.getById(link.id);
      expect(found).toBeNull();
    });

    it("returns false for non-existent ID", async () => {
      const result = await navigationService.delete(9999);
      expect(result).toBe(false);
    });
  });

  describe("reorder", () => {
    it("updates positions to match array order", async () => {
      const a = await navigationService.create({
        label: "A",
        url: "/a",
      });
      const b = await navigationService.create({
        label: "B",
        url: "/b",
      });
      const c = await navigationService.create({
        label: "C",
        url: "/c",
      });

      // Reverse the order
      await navigationService.reorder([c.id, b.id, a.id]);

      const links = await navigationService.list();
      expect(links[0]?.label).toBe("C");
      expect(links[0]?.position).toBe(0);
      expect(links[1]?.label).toBe("B");
      expect(links[1]?.position).toBe(1);
      expect(links[2]?.label).toBe("A");
      expect(links[2]?.position).toBe(2);
    });
  });

  describe("ensureDefaults", () => {
    it("creates default links when table is empty", async () => {
      const links = await navigationService.ensureDefaults();

      expect(links).toHaveLength(3);
      expect(links[0]?.label).toBe("Home");
      expect(links[0]?.url).toBe("/");
      expect(links[1]?.label).toBe("Archive");
      expect(links[1]?.url).toBe("/archive");
      expect(links[2]?.label).toBe("RSS");
      expect(links[2]?.url).toBe("/feed");
    });

    it("returns existing links without creating new ones", async () => {
      await navigationService.create({ label: "Custom", url: "/custom" });

      const links = await navigationService.ensureDefaults();

      expect(links).toHaveLength(1);
      expect(links[0]?.label).toBe("Custom");
    });

    it("is idempotent - calling twice returns same result", async () => {
      const first = await navigationService.ensureDefaults();
      const second = await navigationService.ensureDefaults();

      expect(first).toHaveLength(3);
      expect(second).toHaveLength(3);
      expect(first[0]?.id).toBe(second[0]?.id);
    });
  });
});
