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
    postService = createPostService(db, { slugIdLength: 5 });
  });

  describe("create", () => {
    it("creates a collection with required fields", async () => {
      const collection = await collectionService.create({
        slug: "my-collection",
        title: "My Collection",
      });

      expect(typeof collection.id).toBe("string");
      expect(collection.id.length).toBeGreaterThan(0);
      expect(collection.slug).toBe("my-collection");
      expect(collection.title).toBe("My Collection");
      expect(collection.description).toBeNull();
      expect(collection.icon).toBeNull();
      expect(collection.sortOrder).toBe("newest");
    });

    it("creates a collection with all fields", async () => {
      const collection = await collectionService.create({
        slug: "tech",
        title: "Tech Posts",
        description: "Posts about technology",
        icon: "laptop",
        sortOrder: "oldest",
        position: 5,
      });

      expect(collection.slug).toBe("tech");
      expect(collection.title).toBe("Tech Posts");
      expect(collection.description).toBe("Posts about technology");
      expect(collection.icon).toBe("laptop");
      expect(collection.sortOrder).toBe("oldest");
      expect(collection.position).toBe(5);
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
      const found = await collectionService.getById(
        "00000000-0000-0000-0000-000000009999",
      );
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

    it("updates icon, sortOrder, and position", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
      });

      const updated = await collectionService.update(collection.id, {
        icon: "rocket",
        sortOrder: "rating_desc",
        position: 10,
      });

      expect(updated?.icon).toBe("rocket");
      expect(updated?.sortOrder).toBe("rating_desc");
      expect(updated?.position).toBe(10);
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
      const result = await collectionService.update(
        "00000000-0000-0000-0000-000000009999",
        { title: "X" },
      );
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

    it("removes junction table entries on cascade", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
      });
      const post = await postService.create({
        format: "note",
        body: "test post",
      });

      await collectionService.addPost(collection.id, post.id);

      // Verify association exists
      const before = await collectionService.getCollectionsByPostId(post.id);
      expect(before).toHaveLength(1);

      await collectionService.delete(collection.id);

      // Post should still exist
      const found = await postService.getById(post.id);
      expect(found).not.toBeNull();

      // Association should be gone (cascade delete)
      const after = await collectionService.getCollectionsByPostId(post.id);
      expect(after).toHaveLength(0);
    });

    it("returns false for non-existent collection", async () => {
      const result = await collectionService.delete(
        "00000000-0000-0000-0000-000000009999",
      );
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

      const p1 = await postService.create({ format: "note", body: "post 1" });
      const p2 = await postService.create({ format: "note", body: "post 2" });
      const p3 = await postService.create({ format: "note", body: "post 3" });

      await collectionService.addPost(col1.id, p1.id);
      await collectionService.addPost(col1.id, p2.id);
      await collectionService.addPost(col2.id, p3.id);

      const counts = await collectionService.getPostCounts();
      expect(counts.get(col1.id)).toBe(2);
      expect(counts.get(col2.id)).toBe(1);
    });

    it("does not count posts without a collection", async () => {
      const col = await collectionService.create({
        slug: "col",
        title: "Col",
      });

      const p1 = await postService.create({
        format: "note",
        body: "with collection",
      });
      await postService.create({ format: "note", body: "no collection" });

      await collectionService.addPost(col.id, p1.id);

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
      });
      const post2 = await postService.create({
        format: "note",
        body: "still alive",
      });

      await collectionService.addPost(col.id, post.id);
      await collectionService.addPost(col.id, post2.id);

      // Soft-delete one post
      await postService.delete(post.id);

      const counts = await collectionService.getPostCounts();
      expect(counts.get(col.id)).toBe(1);
    });
  });

  describe("addPost / removePost", () => {
    it("adds a post to a collection", async () => {
      const col = await collectionService.create({
        slug: "test",
        title: "Test",
      });
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      await collectionService.addPost(col.id, post.id);

      const collections = await collectionService.getCollectionsByPostId(
        post.id,
      );
      expect(collections).toHaveLength(1);
      expect(collections[0]?.id).toBe(col.id);
    });

    it("does not duplicate on re-add", async () => {
      const col = await collectionService.create({
        slug: "test",
        title: "Test",
      });
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      await collectionService.addPost(col.id, post.id);
      await collectionService.addPost(col.id, post.id); // duplicate

      const postIds = await collectionService.getPostIds(col.id);
      expect(postIds).toHaveLength(1);
    });

    it("removes a post from a collection", async () => {
      const col = await collectionService.create({
        slug: "test",
        title: "Test",
      });
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      await collectionService.addPost(col.id, post.id);
      await collectionService.removePost(col.id, post.id);

      const collections = await collectionService.getCollectionsByPostId(
        post.id,
      );
      expect(collections).toHaveLength(0);
    });
  });

  describe("getCollectionsByPostId", () => {
    it("returns all collections a post belongs to", async () => {
      const col1 = await collectionService.create({
        slug: "col1",
        title: "Col 1",
        position: 0,
      });
      const col2 = await collectionService.create({
        slug: "col2",
        title: "Col 2",
        position: 1,
      });

      const post = await postService.create({
        format: "note",
        body: "test",
      });

      await collectionService.addPost(col1.id, post.id);
      await collectionService.addPost(col2.id, post.id);

      const collections = await collectionService.getCollectionsByPostId(
        post.id,
      );
      expect(collections).toHaveLength(2);
      expect(collections[0]?.slug).toBe("col1");
      expect(collections[1]?.slug).toBe("col2");
    });

    it("returns empty array for post with no collections", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      const collections = await collectionService.getCollectionsByPostId(
        post.id,
      );
      expect(collections).toHaveLength(0);
    });
  });

  describe("getPostIds", () => {
    it("returns all post IDs in a collection", async () => {
      const col = await collectionService.create({
        slug: "test",
        title: "Test",
      });
      const p1 = await postService.create({ format: "note", body: "one" });
      const p2 = await postService.create({ format: "note", body: "two" });

      await collectionService.addPost(col.id, p1.id);
      await collectionService.addPost(col.id, p2.id);

      const ids = await collectionService.getPostIds(col.id);
      expect(ids).toHaveLength(2);
      expect(ids).toContain(p1.id);
      expect(ids).toContain(p2.id);
    });
  });

  describe("createDivider", () => {
    it("creates a divider with auto-assigned position", async () => {
      const divider = await collectionService.createDivider();

      expect(typeof divider.id).toBe("string");
      expect(divider.id.length).toBeGreaterThan(0);
      expect(divider.position).toBe(0);
      expect(divider.createdAt).toBeGreaterThan(0);
      expect(divider.updatedAt).toBeGreaterThan(0);
    });

    it("assigns position after existing collections", async () => {
      await collectionService.create({ slug: "a", title: "A" }); // position 0
      await collectionService.create({ slug: "b", title: "B" }); // position 1

      const divider = await collectionService.createDivider();
      expect(divider.position).toBe(2);
    });

    it("assigns position after existing dividers", async () => {
      const d1 = await collectionService.createDivider(); // position 0
      const d2 = await collectionService.createDivider(); // position 1

      expect(d1.position).toBe(0);
      expect(d2.position).toBe(1);
    });

    it("considers both collections and dividers for position", async () => {
      await collectionService.create({ slug: "a", title: "A" }); // position 0
      await collectionService.createDivider(); // position 1
      await collectionService.create({ slug: "b", title: "B" }); // position 2

      const divider = await collectionService.createDivider();
      expect(divider.position).toBe(3);
    });
  });

  describe("deleteDivider", () => {
    it("deletes a divider by ID", async () => {
      const divider = await collectionService.createDivider();

      const result = await collectionService.deleteDivider(divider.id);
      expect(result).toBe(true);

      const list = await collectionService.listDividers();
      expect(list).toHaveLength(0);
    });

    it("returns false for non-existent divider", async () => {
      const result = await collectionService.deleteDivider(
        "00000000-0000-0000-0000-000000009999",
      );
      expect(result).toBe(false);
    });
  });

  describe("listDividers", () => {
    it("returns empty array when no dividers exist", async () => {
      const list = await collectionService.listDividers();
      expect(list).toEqual([]);
    });

    it("returns dividers ordered by position", async () => {
      const d1 = await collectionService.createDivider();
      const d2 = await collectionService.createDivider();

      const list = await collectionService.listDividers();
      expect(list).toHaveLength(2);
      expect(list[0]?.id).toBe(d1.id);
      expect(list[1]?.id).toBe(d2.id);
    });
  });

  describe("reorderAll", () => {
    it("handles mixed prefixed IDs correctly", async () => {
      const a = await collectionService.create({ slug: "a", title: "A" });
      const b = await collectionService.create({ slug: "b", title: "B" });
      const d1 = await collectionService.createDivider();

      // Reorder: divider first, then B, then A
      await collectionService.reorderAll([
        `d-${d1.id}`,
        `c-${b.id}`,
        `c-${a.id}`,
      ]);

      const dividers = await collectionService.listDividers();
      expect(dividers[0]?.position).toBe(0);

      const colB = await collectionService.getById(b.id);
      const colA = await collectionService.getById(a.id);
      expect(colB?.position).toBe(1);
      expect(colA?.position).toBe(2);
    });

    it("handles empty array", async () => {
      await collectionService.reorderAll([]);
      // Should not throw
      const list = await collectionService.list();
      expect(list).toEqual([]);
    });

    it("reflects new order in combined list", async () => {
      const a = await collectionService.create({ slug: "a", title: "A" });
      const d1 = await collectionService.createDivider();
      const b = await collectionService.create({ slug: "b", title: "B" });

      // Put divider between B and A
      await collectionService.reorderAll([
        `c-${b.id}`,
        `d-${d1.id}`,
        `c-${a.id}`,
      ]);

      const cols = await collectionService.list();
      const divs = await collectionService.listDividers();

      // B at position 0, divider at 1, A at 2
      expect(cols.find((c) => c.id === b.id)?.position).toBe(0);
      expect(divs[0]?.position).toBe(1);
      expect(cols.find((c) => c.id === a.id)?.position).toBe(2);
    });
  });

  describe("syncPostCollections", () => {
    it("replaces all collection memberships for a post", async () => {
      const col1 = await collectionService.create({
        slug: "col1",
        title: "Col 1",
      });
      const col2 = await collectionService.create({
        slug: "col2",
        title: "Col 2",
      });
      const col3 = await collectionService.create({
        slug: "col3",
        title: "Col 3",
      });

      const post = await postService.create({
        format: "note",
        body: "test",
      });

      // Initially in col1 and col2
      await collectionService.addPost(col1.id, post.id);
      await collectionService.addPost(col2.id, post.id);

      // Sync to col2 and col3
      await collectionService.syncPostCollections(post.id, [col2.id, col3.id]);

      const collections = await collectionService.getCollectionsByPostId(
        post.id,
      );
      const ids = collections.map((c) => c.id);
      expect(ids).toHaveLength(2);
      expect(ids).toContain(col2.id);
      expect(ids).toContain(col3.id);
      expect(ids).not.toContain(col1.id);
    });

    it("removes all collections when empty array provided", async () => {
      const col = await collectionService.create({
        slug: "test",
        title: "Test",
      });
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      await collectionService.addPost(col.id, post.id);
      await collectionService.syncPostCollections(post.id, []);

      const collections = await collectionService.getCollectionsByPostId(
        post.id,
      );
      expect(collections).toHaveLength(0);
    });
  });
});
