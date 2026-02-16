import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createCollectionService } from "../collection.js";
import { createPostService } from "../post.js";
import type { Database } from "../../db/index.js";

describe("CollectionService", () => {
  let db: Database;
  let collectionService: ReturnType<typeof createCollectionService>;
  let postService: ReturnType<typeof createPostService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    collectionService = createCollectionService(db);
    postService = createPostService(db);
  });

  describe("create", () => {
    it("creates a collection with required fields", async () => {
      const collection = await collectionService.create({
        slug: "my-collection",
        title: "My Collection",
      });

      expect(collection.id).toBe(1);
      expect(collection.slug).toBe("my-collection");
      expect(collection.title).toBe("My Collection");
      expect(collection.description).toBeNull();
      expect(collection.icon).toBeNull();
      expect(collection.sortOrder).toBe("newest");
      expect(collection.showDivider).toBe(0);
    });

    it("creates a collection with all fields", async () => {
      const collection = await collectionService.create({
        slug: "tech",
        title: "Tech Posts",
        description: "Posts about technology",
        icon: "laptop",
        sortOrder: "oldest",
        position: 5,
        showDivider: true,
      });

      expect(collection.slug).toBe("tech");
      expect(collection.title).toBe("Tech Posts");
      expect(collection.description).toBe("Posts about technology");
      expect(collection.icon).toBe("laptop");
      expect(collection.sortOrder).toBe("oldest");
      expect(collection.position).toBe(5);
      expect(collection.showDivider).toBe(1);
    });

    it("sets timestamps", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
      });

      expect(collection.createdAt).toBeGreaterThan(0);
      expect(collection.updatedAt).toBeGreaterThan(0);
    });

    it("auto-assigns position when not provided", async () => {
      const first = await collectionService.create({
        slug: "first",
        title: "First",
      });
      const second = await collectionService.create({
        slug: "second",
        title: "Second",
      });
      const third = await collectionService.create({
        slug: "third",
        title: "Third",
      });

      expect(first.position).toBe(0);
      expect(second.position).toBe(1);
      expect(third.position).toBe(2);
    });
  });

  describe("getById", () => {
    it("returns a collection by ID", async () => {
      const created = await collectionService.create({
        slug: "test",
        title: "Test",
      });

      const found = await collectionService.getById(created.id);
      expect(found).not.toBeNull();
      expect(found?.title).toBe("Test");
      expect(found?.slug).toBe("test");
    });

    it("returns null for non-existent ID", async () => {
      const found = await collectionService.getById(9999);
      expect(found).toBeNull();
    });
  });

  describe("getBySlug", () => {
    it("returns a collection by slug", async () => {
      await collectionService.create({ slug: "tech", title: "Tech" });

      const found = await collectionService.getBySlug("tech");
      expect(found).not.toBeNull();
      expect(found?.title).toBe("Tech");
      expect(found?.slug).toBe("tech");
    });

    it("returns null for non-existent slug", async () => {
      const found = await collectionService.getBySlug("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns empty array when no collections exist", async () => {
      const list = await collectionService.list();
      expect(list).toEqual([]);
    });

    it("returns all collections", async () => {
      await collectionService.create({ slug: "first", title: "First" });
      await collectionService.create({ slug: "second", title: "Second" });
      await collectionService.create({ slug: "third", title: "Third" });

      const list = await collectionService.list();
      expect(list).toHaveLength(3);
    });

    it("orders by position ASC, then createdAt DESC", async () => {
      const a = await collectionService.create({
        slug: "a",
        title: "A",
        position: 2,
      });
      const b = await collectionService.create({
        slug: "b",
        title: "B",
        position: 0,
      });
      const c = await collectionService.create({
        slug: "c",
        title: "C",
        position: 1,
      });

      const list = await collectionService.list();
      expect(list[0]?.id).toBe(b.id);
      expect(list[1]?.id).toBe(c.id);
      expect(list[2]?.id).toBe(a.id);
    });
  });

  describe("update", () => {
    it("updates collection title", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Old",
      });

      const updated = await collectionService.update(collection.id, {
        title: "New",
      });

      expect(updated?.title).toBe("New");
    });

    it("updates collection slug", async () => {
      const collection = await collectionService.create({
        slug: "old-slug",
        title: "Test",
      });

      const updated = await collectionService.update(collection.id, {
        slug: "new-slug",
      });

      expect(updated?.slug).toBe("new-slug");
    });

    it("updates description", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
        description: "Old description",
      });

      const updated = await collectionService.update(collection.id, {
        description: "New description",
      });

      expect(updated?.description).toBe("New description");
    });

    it("clears nullable fields with null", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
        description: "Some desc",
        icon: "star",
      });

      const updated = await collectionService.update(collection.id, {
        description: null,
        icon: null,
      });

      expect(updated?.description).toBeNull();
      expect(updated?.icon).toBeNull();
    });

    it("updates icon, sortOrder, position, and showDivider", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
      });

      const updated = await collectionService.update(collection.id, {
        icon: "rocket",
        sortOrder: "rating_desc",
        position: 10,
        showDivider: true,
      });

      expect(updated?.icon).toBe("rocket");
      expect(updated?.sortOrder).toBe("rating_desc");
      expect(updated?.position).toBe(10);
      expect(updated?.showDivider).toBe(1);
    });

    it("updates updatedAt timestamp", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
      });

      const updated = await collectionService.update(collection.id, {
        title: "Updated",
      });

      expect(updated?.updatedAt).toBeGreaterThanOrEqual(collection.updatedAt);
    });

    it("returns null for non-existent collection", async () => {
      const result = await collectionService.update(9999, { title: "X" });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("deletes a collection", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
      });

      const result = await collectionService.delete(collection.id);
      expect(result).toBe(true);

      const found = await collectionService.getById(collection.id);
      expect(found).toBeNull();
    });

    it("clears collectionId on related posts", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
      });
      const post = await postService.create({
        format: "note",
        body: "test post",
        collectionId: collection.id,
      });

      await collectionService.delete(collection.id);

      // Post itself should still exist but with null collectionId
      const found = await postService.getById(post.id);
      expect(found).not.toBeNull();
      expect(found?.collectionId).toBeNull();
    });

    it("returns false for non-existent collection", async () => {
      const result = await collectionService.delete(9999);
      expect(result).toBe(false);
    });
  });

  describe("reorder", () => {
    it("updates positions based on array order", async () => {
      const a = await collectionService.create({ slug: "a", title: "A" });
      const b = await collectionService.create({ slug: "b", title: "B" });
      const c = await collectionService.create({ slug: "c", title: "C" });

      // Reverse the order: C, B, A
      await collectionService.reorder([c.id, b.id, a.id]);

      const reorderedC = await collectionService.getById(c.id);
      const reorderedB = await collectionService.getById(b.id);
      const reorderedA = await collectionService.getById(a.id);

      expect(reorderedC?.position).toBe(0);
      expect(reorderedB?.position).toBe(1);
      expect(reorderedA?.position).toBe(2);
    });

    it("updates updatedAt when reordering", async () => {
      const a = await collectionService.create({ slug: "a", title: "A" });
      const b = await collectionService.create({ slug: "b", title: "B" });

      await collectionService.reorder([b.id, a.id]);

      const reorderedA = await collectionService.getById(a.id);
      expect(reorderedA?.updatedAt).toBeGreaterThanOrEqual(a.updatedAt);
    });

    it("handles empty array", async () => {
      await collectionService.reorder([]);
      // Should not throw
      const list = await collectionService.list();
      expect(list).toEqual([]);
    });

    it("reflects new order in list()", async () => {
      const a = await collectionService.create({ slug: "a", title: "A" });
      const b = await collectionService.create({ slug: "b", title: "B" });
      const c = await collectionService.create({ slug: "c", title: "C" });

      await collectionService.reorder([c.id, a.id, b.id]);

      const list = await collectionService.list();
      expect(list[0]?.id).toBe(c.id);
      expect(list[1]?.id).toBe(a.id);
      expect(list[2]?.id).toBe(b.id);
    });
  });

  describe("getPostCounts", () => {
    it("returns empty map when no posts exist", async () => {
      await collectionService.create({ slug: "empty", title: "Empty" });

      const counts = await collectionService.getPostCounts();
      expect(counts.size).toBe(0);
    });

    it("returns correct counts for collections with posts", async () => {
      const col1 = await collectionService.create({
        slug: "col1",
        title: "Col 1",
      });
      const col2 = await collectionService.create({
        slug: "col2",
        title: "Col 2",
      });

      await postService.create({
        format: "note",
        body: "post 1",
        collectionId: col1.id,
      });
      await postService.create({
        format: "note",
        body: "post 2",
        collectionId: col1.id,
      });
      await postService.create({
        format: "note",
        body: "post 3",
        collectionId: col2.id,
      });

      const counts = await collectionService.getPostCounts();
      expect(counts.get(col1.id)).toBe(2);
      expect(counts.get(col2.id)).toBe(1);
    });

    it("does not count posts without a collection", async () => {
      const col = await collectionService.create({
        slug: "col",
        title: "Col",
      });

      await postService.create({
        format: "note",
        body: "with collection",
        collectionId: col.id,
      });
      await postService.create({
        format: "note",
        body: "no collection",
      });

      const counts = await collectionService.getPostCounts();
      expect(counts.get(col.id)).toBe(1);
      expect(counts.size).toBe(1);
    });

    it("does not count soft-deleted posts", async () => {
      const col = await collectionService.create({
        slug: "col",
        title: "Col",
      });

      const post = await postService.create({
        format: "note",
        body: "will be deleted",
        collectionId: col.id,
      });
      await postService.create({
        format: "note",
        body: "still alive",
        collectionId: col.id,
      });

      // Soft-delete one post
      await postService.delete(post.id);

      const counts = await collectionService.getPostCounts();
      expect(counts.get(col.id)).toBe(1);
    });
  });
});
