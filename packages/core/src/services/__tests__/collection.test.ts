import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createTestDatabase,
  DEFAULT_TEST_SITE_ID,
} from "../../__tests__/helpers/db.js";
import {
  collections,
  collectionDirectoryItems as sidebarItems,
} from "../../db/schema.js";
import { createCollectionService } from "../collection.js";
import { createPathService } from "../path.js";
import { createPostService } from "../post.js";
import type { Database } from "../../db/index.js";
import { MAX_COLLECTION_SLUG_LENGTH } from "../../types.js";

describe("CollectionService", () => {
  let db: Database;
  let collectionService: ReturnType<typeof createCollectionService>;
  let postService: ReturnType<typeof createPostService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    collectionService = createCollectionService(db, DEFAULT_TEST_SITE_ID);
    postService = createPostService(
      db,
      { slugIdLength: 5 },
      DEFAULT_TEST_SITE_ID,
    );
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
      expect(collection.sortOrder).toBe("newest");
    });

    it("creates a collection with all fields", async () => {
      const collection = await collectionService.create({
        slug: "tech",
        title: "Tech Posts",
        description: "Posts about technology",
        sortOrder: "oldest",
      });

      expect(collection.slug).toBe("tech");
      expect(collection.title).toBe("Tech Posts");
      expect(collection.description).toBe("Posts about technology");
      expect(collection.sortOrder).toBe("oldest");
    });

    it("sets timestamps", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
      });

      expect(collection.createdAt).toBeGreaterThan(0);
      expect(collection.updatedAt).toBeGreaterThan(0);
    });

    it("auto-creates a sidebar item", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
      });

      const sidebarItems = await collectionService.listSidebarItems();
      expect(sidebarItems).toHaveLength(1);
      expect(sidebarItems[0]?.type).toBe("collection");
      expect(sidebarItems[0]?.collectionId).toBe(collection.id);
      expect(typeof sidebarItems[0]?.position).toBe("string");
    });

    it("rolls back the collection insert when slug persistence fails inside the batch", async () => {
      await collectionService.create({
        slug: "race-condition",
        title: "Existing",
      });

      const paths = createPathService(db, DEFAULT_TEST_SITE_ID);
      const raceyPaths = {
        ...paths,
        isPathAvailable: async () => true,
      };
      const raceyCollectionService = createCollectionService(
        db,
        DEFAULT_TEST_SITE_ID,
        raceyPaths,
      );

      await expect(
        raceyCollectionService.create({
          slug: "race-condition",
          title: "Race Condition",
        }),
      ).rejects.toThrow('Slug "race-condition" is already in use');

      const rows = await db.select({ id: collections.id }).from(collections);
      expect(rows).toHaveLength(1);
    });

    it("rejects slugs longer than the maximum length", async () => {
      await expect(
        collectionService.create({
          slug: "a".repeat(MAX_COLLECTION_SLUG_LENGTH + 1),
          title: "Too Long",
        }),
      ).rejects.toThrow();
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
  });

  describe("listByRecentActivity", () => {
    it("breaks recent-added ties by newer collections first", async () => {
      vi.useFakeTimers();

      try {
        vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
        const older = await collectionService.create({
          slug: "older",
          title: "Older",
        });

        vi.setSystemTime(new Date("2024-01-01T00:00:10Z"));
        const newer = await collectionService.create({
          slug: "newer",
          title: "Newer",
        });

        vi.setSystemTime(new Date("2024-01-01T00:01:00Z"));
        await postService.create({
          format: "note",
          bodyMarkdown: "shared add",
          collectionIds: [older.id, newer.id],
        });

        const collections = await collectionService.listByRecentActivity();
        expect(collections.map((collection) => collection.id)).toEqual([
          newer.id,
          older.id,
        ]);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("listDirectoryData", () => {
    it("returns collections with recent activity and labeled dividers", async () => {
      const reading = await collectionService.create({
        slug: "reading",
        title: "Reading",
      });
      const divider = await collectionService.createSidebarItem(
        "divider",
        undefined,
        "Essays",
      );

      const post = await postService.create({
        format: "note",
        bodyMarkdown: "Book note",
      });
      await collectionService.addPost(reading.id, post.id);

      const directory = await collectionService.listDirectoryData();

      expect(directory.collections).toHaveLength(1);
      expect(directory.collections[0]?.recentActivityAt).toBe(
        post.lastActivityAt,
      );
      expect(
        directory.sidebarItems.find((item) => item.id === divider.id)?.label,
      ).toBe("Essays");
      expect(directory.items).toEqual([
        expect.objectContaining({
          type: "collection",
          collection: expect.objectContaining({
            id: reading.id,
            postCount: 1,
            recentActivityAt: post.lastActivityAt,
          }),
        }),
        expect.objectContaining({
          id: divider.id,
          type: "divider",
          label: "Essays",
        }),
      ]);
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
      });

      const updated = await collectionService.update(collection.id, {
        description: null,
      });

      expect(updated?.description).toBeNull();
    });

    it("updates sortOrder", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
      });

      const updated = await collectionService.update(collection.id, {
        sortOrder: "rating_desc",
      });

      expect(updated?.sortOrder).toBe("rating_desc");
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
        bodyMarkdown: "test post",
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

    it("removes sidebar item when collection is deleted", async () => {
      const collection = await collectionService.create({
        slug: "test",
        title: "Test",
      });

      // Verify sidebar item exists
      const before = await collectionService.listSidebarItems();
      expect(before).toHaveLength(1);

      await collectionService.delete(collection.id);

      // Sidebar item should be gone
      const after = await collectionService.listSidebarItems();
      expect(after).toHaveLength(0);
    });

    it("returns false for non-existent collection", async () => {
      const result = await collectionService.delete(
        "00000000-0000-0000-0000-000000009999",
      );
      expect(result).toBe(false);
    });
  });

  describe("listSidebarItems", () => {
    it("returns empty array when no items exist", async () => {
      const items = await collectionService.listSidebarItems();
      expect(items).toEqual([]);
    });

    it("returns items ordered by position", async () => {
      await collectionService.create({ slug: "first", title: "First" });
      await collectionService.create({ slug: "second", title: "Second" });

      const items = await collectionService.listSidebarItems();
      expect(items).toHaveLength(2);
      expect(items[0]?.type).toBe("collection");
      expect(items[1]?.type).toBe("collection");
      // First created should come first (string comparison for fractional indexing)
      const pos0 = items[0]?.position ?? "";
      const pos1 = items[1]?.position ?? "";
      expect(pos0 < pos1).toBe(true);
    });

    it("includes dividers", async () => {
      await collectionService.create({ slug: "a", title: "A" });
      await collectionService.createSidebarItem("divider");
      await collectionService.create({ slug: "b", title: "B" });

      const items = await collectionService.listSidebarItems();
      expect(items).toHaveLength(3);
      expect(items[0]?.type).toBe("collection");
      expect(items[1]?.type).toBe("divider");
      expect(items[2]?.type).toBe("collection");
    });
  });

  describe("createSidebarItem", () => {
    it("creates a divider", async () => {
      const item = await collectionService.createSidebarItem("divider");

      expect(item.type).toBe("divider");
      expect(item.collectionId).toBeNull();
      expect(item.label).toBeNull();
      expect(typeof item.position).toBe("string");
      expect(item.createdAt).toBeGreaterThan(0);
    });

    it("creates items with incrementing positions", async () => {
      const first = await collectionService.createSidebarItem("divider");
      const second = await collectionService.createSidebarItem("divider");

      expect(first.position < second.position).toBe(true);
    });

    it("rejects adding the same collection twice", async () => {
      const collection = await collectionService.create({
        slug: "notes",
        title: "Notes",
      });

      await expect(
        collectionService.createSidebarItem("collection", collection.id),
      ).rejects.toThrow("Collection is already in the sidebar.");
    });

    it("rejects duplicate sidebar positions at the database layer", async () => {
      const item = await collectionService.createSidebarItem("divider");

      await expect(
        db.insert(sidebarItems).values({
          id: "00000000-0000-7000-8000-000000000001",
          type: "divider",
          collectionId: null,
          position: item.position,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }),
      ).rejects.toThrow();
    });
  });

  describe("updateSidebarItem", () => {
    it("updates and trims a divider label", async () => {
      const item = await collectionService.createSidebarItem("divider");

      const updated = await collectionService.updateSidebarItem(item.id, {
        label: "  Writing  ",
      });

      expect(updated?.label).toBe("Writing");
    });
  });

  describe("deleteSidebarItem", () => {
    it("deletes a sidebar item", async () => {
      const item = await collectionService.createSidebarItem("divider");
      const result = await collectionService.deleteSidebarItem(item.id);
      expect(result).toBe(true);

      const items = await collectionService.listSidebarItems();
      expect(items).toHaveLength(0);
    });

    it("returns false for non-existent item", async () => {
      const result = await collectionService.deleteSidebarItem(
        "00000000-0000-0000-0000-000000009999",
      );
      expect(result).toBe(false);
    });
  });

  describe("moveSidebarItem", () => {
    it("moves an item between two others", async () => {
      const col1 = await collectionService.create({ slug: "a", title: "A" });
      const col2 = await collectionService.create({ slug: "b", title: "B" });
      const col3 = await collectionService.create({ slug: "c", title: "C" });

      // Get sidebar items (A, B, C order)
      const items = await collectionService.listSidebarItems();
      expect(items).toHaveLength(3);
      const itemA = items.find((i) => i.collectionId === col1.id);
      const itemB = items.find((i) => i.collectionId === col2.id);
      const itemC = items.find((i) => i.collectionId === col3.id);
      expect(itemA).toBeDefined();
      expect(itemB).toBeDefined();
      expect(itemC).toBeDefined();

      // Move C between A and B
      const moved = await collectionService.moveSidebarItem(
        itemC?.id ?? "",
        itemA?.id ?? "",
        itemB?.id ?? "",
      );

      expect(moved).not.toBeNull();

      // Verify new order: A, C, B
      const reordered = await collectionService.listSidebarItems();
      expect(reordered[0]?.collectionId).toBe(col1.id);
      expect(reordered[1]?.collectionId).toBe(col3.id);
      expect(reordered[2]?.collectionId).toBe(col2.id);
    });

    it("moves an item to the beginning", async () => {
      const col1 = await collectionService.create({ slug: "a", title: "A" });
      const col2 = await collectionService.create({ slug: "b", title: "B" });
      const col3 = await collectionService.create({ slug: "c", title: "C" });

      const items = await collectionService.listSidebarItems();
      const itemA = items.find((i) => i.collectionId === col1.id);
      const itemC = items.find((i) => i.collectionId === col3.id);
      expect(itemA).toBeDefined();
      expect(itemC).toBeDefined();

      // Move C to the beginning (before A, no after)
      await collectionService.moveSidebarItem(
        itemC?.id ?? "",
        null,
        itemA?.id ?? "",
      );

      const reordered = await collectionService.listSidebarItems();
      expect(reordered[0]?.collectionId).toBe(col3.id);
      expect(reordered[1]?.collectionId).toBe(col1.id);
      expect(reordered[2]?.collectionId).toBe(col2.id);
    });

    it("moves an item to the end", async () => {
      const col1 = await collectionService.create({ slug: "a", title: "A" });
      const col2 = await collectionService.create({ slug: "b", title: "B" });
      const col3 = await collectionService.create({ slug: "c", title: "C" });

      const items = await collectionService.listSidebarItems();
      const itemA = items.find((i) => i.collectionId === col1.id);
      const itemC = items.find((i) => i.collectionId === col3.id);
      expect(itemA).toBeDefined();
      expect(itemC).toBeDefined();

      // Move A to the end (after C, no before)
      await collectionService.moveSidebarItem(
        itemA?.id ?? "",
        itemC?.id ?? "",
        null,
      );

      const reordered = await collectionService.listSidebarItems();
      expect(reordered[0]?.collectionId).toBe(col2.id);
      expect(reordered[1]?.collectionId).toBe(col3.id);
      expect(reordered[2]?.collectionId).toBe(col1.id);
    });

    it("returns null for non-existent item", async () => {
      const result = await collectionService.moveSidebarItem(
        "00000000-0000-0000-0000-000000009999",
        null,
        null,
      );
      expect(result).toBeNull();
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

      const p1 = await postService.create({
        format: "note",
        bodyMarkdown: "post 1",
      });
      const p2 = await postService.create({
        format: "note",
        bodyMarkdown: "post 2",
      });
      const p3 = await postService.create({
        format: "note",
        bodyMarkdown: "post 3",
      });

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
        bodyMarkdown: "with collection",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "no collection",
      });

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
        bodyMarkdown: "will be deleted",
      });
      const post2 = await postService.create({
        format: "note",
        bodyMarkdown: "still alive",
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
        bodyMarkdown: "test",
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
        bodyMarkdown: "test",
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
        bodyMarkdown: "test",
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
      await collectionService.create({
        slug: "col1",
        title: "Col 1",
      });
      await collectionService.create({
        slug: "col2",
        title: "Col 2",
      });

      const cols = await collectionService.list();
      expect(cols).toHaveLength(2);
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
      });

      await collectionService.addPost(cols[0]?.id ?? "", post.id);
      await collectionService.addPost(cols[1]?.id ?? "", post.id);

      const collections = await collectionService.getCollectionsByPostId(
        post.id,
      );
      expect(collections).toHaveLength(2);
    });

    it("returns empty array for post with no collections", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
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
      const p1 = await postService.create({
        format: "note",
        bodyMarkdown: "one",
      });
      const p2 = await postService.create({
        format: "note",
        bodyMarkdown: "two",
      });

      await collectionService.addPost(col.id, p1.id);
      await collectionService.addPost(col.id, p2.id);

      const ids = await collectionService.getPostIds(col.id);
      expect(ids).toHaveLength(2);
      expect(ids).toContain(p1.id);
      expect(ids).toContain(p2.id);
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
        bodyMarkdown: "test",
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
        bodyMarkdown: "test",
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
