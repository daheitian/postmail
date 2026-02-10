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
        title: "My Collection",
      });

      expect(collection.id).toBe(1);
      expect(collection.title).toBe("My Collection");
      expect(collection.path).toBeNull();
      expect(collection.description).toBeNull();
    });

    it("creates a collection with all fields", async () => {
      const collection = await collectionService.create({
        title: "Tech Posts",
        path: "tech",
        description: "Posts about technology",
      });

      expect(collection.title).toBe("Tech Posts");
      expect(collection.path).toBe("tech");
      expect(collection.description).toBe("Posts about technology");
    });

    it("sets timestamps", async () => {
      const collection = await collectionService.create({
        title: "Test",
      });

      expect(collection.createdAt).toBeGreaterThan(0);
      expect(collection.updatedAt).toBeGreaterThan(0);
    });
  });

  describe("getById", () => {
    it("returns a collection by ID", async () => {
      const created = await collectionService.create({ title: "Test" });

      const found = await collectionService.getById(created.id);
      expect(found).not.toBeNull();
      expect(found?.title).toBe("Test");
    });

    it("returns null for non-existent ID", async () => {
      const found = await collectionService.getById(9999);
      expect(found).toBeNull();
    });
  });

  describe("getByPath", () => {
    it("returns a collection by path", async () => {
      await collectionService.create({ title: "Tech", path: "tech" });

      const found = await collectionService.getByPath("tech");
      expect(found).not.toBeNull();
      expect(found?.title).toBe("Tech");
    });

    it("returns null for non-existent path", async () => {
      const found = await collectionService.getByPath("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns empty array when no collections exist", async () => {
      const list = await collectionService.list();
      expect(list).toEqual([]);
    });

    it("returns all collections", async () => {
      await collectionService.create({ title: "First" });
      await collectionService.create({ title: "Second" });
      await collectionService.create({ title: "Third" });

      const list = await collectionService.list();
      expect(list).toHaveLength(3);
    });
  });

  describe("update", () => {
    it("updates collection title", async () => {
      const collection = await collectionService.create({ title: "Old" });

      const updated = await collectionService.update(collection.id, {
        title: "New",
      });

      expect(updated?.title).toBe("New");
    });

    it("updates collection path", async () => {
      const collection = await collectionService.create({
        title: "Test",
        path: "old-path",
      });

      const updated = await collectionService.update(collection.id, {
        path: "new-path",
      });

      expect(updated?.path).toBe("new-path");
    });

    it("returns null for non-existent collection", async () => {
      const result = await collectionService.update(9999, { title: "X" });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("deletes a collection", async () => {
      const collection = await collectionService.create({ title: "Test" });

      const result = await collectionService.delete(collection.id);
      expect(result).toBe(true);

      const found = await collectionService.getById(collection.id);
      expect(found).toBeNull();
    });

    it("deletes associated post-collection relationships", async () => {
      const collection = await collectionService.create({ title: "Test" });
      const post = await postService.create({
        type: "note",
        content: "test",
      });

      await collectionService.addPost(collection.id, post.id);
      await collectionService.delete(collection.id);

      // Post itself should still exist
      expect(await postService.getById(post.id)).not.toBeNull();
    });

    it("returns false for non-existent collection", async () => {
      const result = await collectionService.delete(9999);
      expect(result).toBe(false);
    });
  });

  describe("post relationships", () => {
    it("adds a post to a collection", async () => {
      const collection = await collectionService.create({ title: "Test" });
      const post = await postService.create({
        type: "note",
        content: "test",
      });

      await collectionService.addPost(collection.id, post.id);

      const posts = await collectionService.getPosts(collection.id);
      expect(posts).toHaveLength(1);
      expect(posts[0]?.id).toBe(post.id);
    });

    it("adding same post twice is idempotent", async () => {
      const collection = await collectionService.create({ title: "Test" });
      const post = await postService.create({
        type: "note",
        content: "test",
      });

      await collectionService.addPost(collection.id, post.id);
      await collectionService.addPost(collection.id, post.id);

      const posts = await collectionService.getPosts(collection.id);
      expect(posts).toHaveLength(1);
    });

    it("removes a post from a collection", async () => {
      const collection = await collectionService.create({ title: "Test" });
      const post = await postService.create({
        type: "note",
        content: "test",
      });

      await collectionService.addPost(collection.id, post.id);
      await collectionService.removePost(collection.id, post.id);

      const posts = await collectionService.getPosts(collection.id);
      expect(posts).toHaveLength(0);
    });

    it("returns collections for a post", async () => {
      const col1 = await collectionService.create({ title: "Col 1" });
      const col2 = await collectionService.create({ title: "Col 2" });
      const post = await postService.create({
        type: "note",
        content: "test",
      });

      await collectionService.addPost(col1.id, post.id);
      await collectionService.addPost(col2.id, post.id);

      const collections = await collectionService.getCollectionsForPost(
        post.id,
      );
      expect(collections).toHaveLength(2);
    });

    it("getPosts returns empty array for empty collection", async () => {
      const collection = await collectionService.create({ title: "Empty" });
      const posts = await collectionService.getPosts(collection.id);
      expect(posts).toEqual([]);
    });
  });

  describe("syncPostCollections", () => {
    it("adds collections to a post with no existing collections", async () => {
      const col1 = await collectionService.create({ title: "Col 1" });
      const col2 = await collectionService.create({ title: "Col 2" });
      const post = await postService.create({
        type: "note",
        content: "test",
      });

      await collectionService.syncPostCollections(post.id, [col1.id, col2.id]);

      const collections = await collectionService.getCollectionsForPost(
        post.id,
      );
      expect(collections).toHaveLength(2);
      expect(collections.map((c) => c.id).sort()).toEqual(
        [col1.id, col2.id].sort(),
      );
    });

    it("removes collections no longer in the list", async () => {
      const col1 = await collectionService.create({ title: "Col 1" });
      const col2 = await collectionService.create({ title: "Col 2" });
      const post = await postService.create({
        type: "note",
        content: "test",
      });

      await collectionService.addPost(col1.id, post.id);
      await collectionService.addPost(col2.id, post.id);

      // Sync with only col1 — col2 should be removed
      await collectionService.syncPostCollections(post.id, [col1.id]);

      const collections = await collectionService.getCollectionsForPost(
        post.id,
      );
      expect(collections).toHaveLength(1);
      expect(collections[0]?.id).toBe(col1.id);
    });

    it("handles mixed adds and removes", async () => {
      const col1 = await collectionService.create({ title: "Col 1" });
      const col2 = await collectionService.create({ title: "Col 2" });
      const col3 = await collectionService.create({ title: "Col 3" });
      const post = await postService.create({
        type: "note",
        content: "test",
      });

      // Start with col1 and col2
      await collectionService.addPost(col1.id, post.id);
      await collectionService.addPost(col2.id, post.id);

      // Sync to col2 and col3 (remove col1, keep col2, add col3)
      await collectionService.syncPostCollections(post.id, [col2.id, col3.id]);

      const collections = await collectionService.getCollectionsForPost(
        post.id,
      );
      expect(collections).toHaveLength(2);
      expect(collections.map((c) => c.id).sort()).toEqual(
        [col2.id, col3.id].sort(),
      );
    });

    it("removes all collections when synced with empty array", async () => {
      const col1 = await collectionService.create({ title: "Col 1" });
      const post = await postService.create({
        type: "note",
        content: "test",
      });

      await collectionService.addPost(col1.id, post.id);

      await collectionService.syncPostCollections(post.id, []);

      const collections = await collectionService.getCollectionsForPost(
        post.id,
      );
      expect(collections).toHaveLength(0);
    });

    it("is a no-op when already in sync", async () => {
      const col1 = await collectionService.create({ title: "Col 1" });
      const post = await postService.create({
        type: "note",
        content: "test",
      });

      await collectionService.addPost(col1.id, post.id);

      await collectionService.syncPostCollections(post.id, [col1.id]);

      const collections = await collectionService.getCollectionsForPost(
        post.id,
      );
      expect(collections).toHaveLength(1);
      expect(collections[0]?.id).toBe(col1.id);
    });
  });
});
