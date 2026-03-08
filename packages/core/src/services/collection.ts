/**
 * Collection Service (v2)
 *
 * Manages collections. Posts belong to collections via post_collections junction table (M:N).
 * Sidebar ordering is managed through the sidebar_items table with fractional indexing.
 */

import { eq, asc, sql, and } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { uuidv7 } from "uuidv7";
import type { Database } from "../db/index.js";
import { collections, sidebarItems, postCollections } from "../db/schema.js";
import { now } from "../lib/time.js";
import type {
  Collection,
  SidebarItem,
  SidebarItemType,
  CreateCollection,
  UpdateCollection,
  SortOrder,
} from "../types.js";

export interface CollectionService {
  getById(id: string): Promise<Collection | null>;
  getBySlug(slug: string): Promise<Collection | null>;
  list(): Promise<Collection[]>;
  create(data: CreateCollection): Promise<Collection>;
  update(id: string, data: UpdateCollection): Promise<Collection | null>;
  delete(id: string): Promise<boolean>;
  /** List all sidebar items ordered by position */
  listSidebarItems(): Promise<SidebarItem[]>;
  /** Create a sidebar item (collection or divider) */
  createSidebarItem(
    type: SidebarItemType,
    collectionId?: string,
  ): Promise<SidebarItem>;
  /** Delete a sidebar item by ID */
  deleteSidebarItem(id: string): Promise<boolean>;
  /** Move a sidebar item between two neighbors */
  moveSidebarItem(
    id: string,
    after: string | null,
    before: string | null,
  ): Promise<SidebarItem | null>;
  /** Get post count per collection */
  getPostCounts(): Promise<Map<string, number>>;
  /** Add a post to a collection */
  addPost(collectionId: string, postId: string): Promise<void>;
  /** Remove a post from a collection */
  removePost(collectionId: string, postId: string): Promise<void>;
  /** Get all collections a post belongs to */
  getCollectionsByPostId(postId: string): Promise<Collection[]>;
  /** Get all post IDs in a collection */
  getPostIds(collectionId: string): Promise<string[]>;
  /** Sync a post's collection memberships (replace all with given IDs) */
  syncPostCollections(postId: string, collectionIds: string[]): Promise<void>;
}

export function createCollectionService(db: Database): CollectionService {
  function toCollection(row: typeof collections.$inferSelect): Collection {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      icon: row.icon,
      sortOrder: row.sortOrder as SortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  function toSidebarItem(row: typeof sidebarItems.$inferSelect): SidebarItem {
    return {
      id: row.id,
      type: row.type as SidebarItemType,
      collectionId: row.collectionId,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async function getLastSidebarPosition(): Promise<string | null> {
    const rows = await db
      .select({ position: sidebarItems.position })
      .from(sidebarItems)
      .orderBy(sql`${sidebarItems.position} DESC`)
      .limit(1);
    return rows[0]?.position ?? null;
  }

  return {
    async getById(id) {
      const result = await db
        .select()
        .from(collections)
        .where(eq(collections.id, id))
        .limit(1);
      return result[0] ? toCollection(result[0]) : null;
    },

    async getBySlug(slug) {
      const result = await db
        .select()
        .from(collections)
        .where(eq(collections.slug, slug))
        .limit(1);
      return result[0] ? toCollection(result[0]) : null;
    },

    async list() {
      const rows = await db
        .select()
        .from(collections)
        .orderBy(asc(collections.createdAt));
      return rows.map(toCollection);
    },

    async create(data) {
      const id = uuidv7();
      const timestamp = now();

      const result = await db
        .insert(collections)
        .values({
          id,
          slug: data.slug,
          title: data.title,
          description: data.description ?? null,
          icon: data.icon ?? null,
          sortOrder: data.sortOrder ?? "newest",
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      // Auto-create a sidebar item for this collection
      const lastPos = await getLastSidebarPosition();
      const position = generateKeyBetween(lastPos, null);
      await db.insert(sidebarItems).values({
        id: uuidv7(),
        type: "collection",
        collectionId: id,
        position,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      return toCollection(result[0]!);
    },

    async update(id, data) {
      const existing = await this.getById(id);
      if (!existing) return null;

      const timestamp = now();
      const updates: Partial<typeof collections.$inferInsert> = {
        updatedAt: timestamp,
      };

      if (data.title !== undefined) updates.title = data.title;
      if (data.slug !== undefined) updates.slug = data.slug;
      if (data.description !== undefined)
        updates.description = data.description;
      if (data.icon !== undefined) updates.icon = data.icon;
      if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

      const result = await db
        .update(collections)
        .set(updates)
        .where(eq(collections.id, id))
        .returning();

      return result[0] ? toCollection(result[0]) : null;
    },

    async delete(id) {
      // Clean up junction table entries manually (no FK CASCADE with text PKs)
      await db
        .delete(postCollections)
        .where(eq(postCollections.collectionId, id));
      // Clean up sidebar item for this collection
      await db.delete(sidebarItems).where(eq(sidebarItems.collectionId, id));
      const result = await db
        .delete(collections)
        .where(eq(collections.id, id))
        .returning();
      return result.length > 0;
    },

    async listSidebarItems() {
      const rows = await db
        .select()
        .from(sidebarItems)
        .orderBy(asc(sidebarItems.position));
      return rows.map(toSidebarItem);
    },

    async createSidebarItem(type, collectionId) {
      const id = uuidv7();
      const timestamp = now();

      const lastPos = await getLastSidebarPosition();
      const position = generateKeyBetween(lastPos, null);

      const result = await db
        .insert(sidebarItems)
        .values({
          id,
          type,
          collectionId: collectionId ?? null,
          position,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      return toSidebarItem(result[0]!);
    },

    async deleteSidebarItem(id) {
      const result = await db
        .delete(sidebarItems)
        .where(eq(sidebarItems.id, id))
        .returning();
      return result.length > 0;
    },

    async moveSidebarItem(id, afterId, beforeId) {
      // Look up the item
      const items = await db
        .select()
        .from(sidebarItems)
        .where(eq(sidebarItems.id, id))
        .limit(1);
      if (!items[0]) return null;

      // Look up neighbor positions
      let afterPos: string | null = null;
      let beforePos: string | null = null;

      if (afterId) {
        const afterRows = await db
          .select({ position: sidebarItems.position })
          .from(sidebarItems)
          .where(eq(sidebarItems.id, afterId))
          .limit(1);
        afterPos = afterRows[0]?.position ?? null;
      }

      if (beforeId) {
        const beforeRows = await db
          .select({ position: sidebarItems.position })
          .from(sidebarItems)
          .where(eq(sidebarItems.id, beforeId))
          .limit(1);
        beforePos = beforeRows[0]?.position ?? null;
      }

      const newPosition = generateKeyBetween(afterPos, beforePos);
      const timestamp = now();

      const result = await db
        .update(sidebarItems)
        .set({ position: newPosition, updatedAt: timestamp })
        .where(eq(sidebarItems.id, id))
        .returning();

      return result[0] ? toSidebarItem(result[0]) : null;
    },

    async getPostCounts() {
      const rows = await db
        .select({
          collectionId: postCollections.collectionId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(postCollections)
        .innerJoin(
          sql`posts`,
          sql`posts.id = ${postCollections.postId} AND posts.deleted_at IS NULL`,
        )
        .groupBy(postCollections.collectionId);

      const counts = new Map<string, number>();
      for (const row of rows) {
        counts.set(row.collectionId, row.count);
      }
      return counts;
    },

    async addPost(collectionId, postId) {
      await db
        .insert(postCollections)
        .values({ postId, collectionId })
        .onConflictDoNothing();
    },

    async removePost(collectionId, postId) {
      await db
        .delete(postCollections)
        .where(
          and(
            eq(postCollections.postId, postId),
            eq(postCollections.collectionId, collectionId),
          ),
        );
    },

    async getCollectionsByPostId(postId) {
      const rows = await db
        .select({ collection: collections })
        .from(postCollections)
        .innerJoin(
          collections,
          eq(postCollections.collectionId, collections.id),
        )
        .where(eq(postCollections.postId, postId))
        .orderBy(asc(collections.createdAt));

      return rows.map((r) => toCollection(r.collection));
    },

    async getPostIds(collectionId) {
      const rows = await db
        .select({ postId: postCollections.postId })
        .from(postCollections)
        .where(eq(postCollections.collectionId, collectionId));

      return rows.map((r) => r.postId);
    },

    async syncPostCollections(postId, collectionIds) {
      if (collectionIds.length === 0) {
        // Only delete — single statement, no batch needed
        await db
          .delete(postCollections)
          .where(eq(postCollections.postId, postId));
        return;
      }
      // Delete existing + insert new atomically
      const deleteQuery = db
        .delete(postCollections)
        .where(eq(postCollections.postId, postId));
      const insertQuery = db
        .insert(postCollections)
        .values(
          collectionIds.map((collectionId) => ({ postId, collectionId })),
        );
      await db.batch([deleteQuery, insertQuery]);
    },
  };
}
