/**
 * Collection Service (v2)
 *
 * Manages collections. Posts belong to collections via post_collections junction table (M:N).
 */

import { eq, asc, sql, desc, and } from "drizzle-orm";
import type { Database } from "../db/index.js";
import {
  collections,
  collectionDividers,
  postCollections,
} from "../db/schema.js";
import { now } from "../lib/time.js";
import type {
  Collection,
  CollectionDivider,
  CreateCollection,
  UpdateCollection,
  SortOrder,
} from "../types.js";

export interface CollectionService {
  getById(id: number): Promise<Collection | null>;
  getBySlug(slug: string): Promise<Collection | null>;
  list(): Promise<Collection[]>;
  create(data: CreateCollection): Promise<Collection>;
  update(id: number, data: UpdateCollection): Promise<Collection | null>;
  delete(id: number): Promise<boolean>;
  reorder(ids: number[]): Promise<void>;
  /** Reorder mixed collections and dividers using prefixed IDs (e.g. "c-1", "d-2") */
  reorderAll(items: string[]): Promise<void>;
  /** Create a standalone divider with auto-assigned position */
  createDivider(): Promise<CollectionDivider>;
  /** Delete a divider by ID */
  deleteDivider(id: number): Promise<boolean>;
  /** List all dividers ordered by position */
  listDividers(): Promise<CollectionDivider[]>;
  /** Get post count per collection */
  getPostCounts(): Promise<Map<number, number>>;
  /** Add a post to a collection */
  addPost(collectionId: number, postId: number): Promise<void>;
  /** Remove a post from a collection */
  removePost(collectionId: number, postId: number): Promise<void>;
  /** Get all collections a post belongs to */
  getCollectionsByPostId(postId: number): Promise<Collection[]>;
  /** Get all post IDs in a collection */
  getPostIds(collectionId: number): Promise<number[]>;
  /** Sync a post's collection memberships (replace all with given IDs) */
  syncPostCollections(postId: number, collectionIds: number[]): Promise<void>;
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
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  function toDivider(
    row: typeof collectionDividers.$inferSelect,
  ): CollectionDivider {
    return {
      id: row.id,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
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
        .orderBy(asc(collections.position), desc(collections.createdAt));
      return rows.map(toCollection);
    },

    async create(data) {
      const timestamp = now();

      let position = data.position;
      if (position === undefined) {
        const maxResult = await db
          .select({ maxPos: sql<number>`COALESCE(MAX(position), -1)` })
          .from(collections);
        const divMaxResult = await db
          .select({ maxPos: sql<number>`COALESCE(MAX(position), -1)` })
          .from(collectionDividers);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- aggregate always returns one row
        position = Math.max(maxResult[0]!.maxPos, divMaxResult[0]!.maxPos) + 1;
      }

      const result = await db
        .insert(collections)
        .values({
          slug: data.slug,
          title: data.title,
          description: data.description ?? null,
          icon: data.icon ?? null,
          sortOrder: data.sortOrder ?? "newest",
          position,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

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
      if (data.position !== undefined) updates.position = data.position;

      const result = await db
        .update(collections)
        .set(updates)
        .where(eq(collections.id, id))
        .returning();

      return result[0] ? toCollection(result[0]) : null;
    },

    async delete(id) {
      // Junction table entries are cleaned up by ON DELETE CASCADE
      const result = await db
        .delete(collections)
        .where(eq(collections.id, id))
        .returning();
      return result.length > 0;
    },

    async reorder(ids) {
      // Delegate to reorderAll with "c-" prefix for backward compat
      await this.reorderAll(ids.map((id) => `c-${id}`));
    },

    async reorderAll(items) {
      if (items.length === 0) return;
      const timestamp = now();
      const queries = items.map((item, i) => {
        const [prefix, idStr] = item.split("-");
        const id = Number(idStr);
        if (prefix === "d") {
          return db
            .update(collectionDividers)
            .set({ position: i, updatedAt: timestamp })
            .where(eq(collectionDividers.id, id));
        }
        return db
          .update(collections)
          .set({ position: i, updatedAt: timestamp })
          .where(eq(collections.id, id));
      });
      await db.batch(
        queries as [(typeof queries)[number], ...(typeof queries)[number][]],
      );
    },

    async createDivider() {
      const timestamp = now();

      const colMax = await db
        .select({ maxPos: sql<number>`COALESCE(MAX(position), -1)` })
        .from(collections);
      const divMax = await db
        .select({ maxPos: sql<number>`COALESCE(MAX(position), -1)` })
        .from(collectionDividers);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- aggregate always returns one row
      const position = Math.max(colMax[0]!.maxPos, divMax[0]!.maxPos) + 1;

      const result = await db
        .insert(collectionDividers)
        .values({
          position,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      return toDivider(result[0]!);
    },

    async deleteDivider(id) {
      const result = await db
        .delete(collectionDividers)
        .where(eq(collectionDividers.id, id))
        .returning();
      return result.length > 0;
    },

    async listDividers() {
      const rows = await db
        .select()
        .from(collectionDividers)
        .orderBy(asc(collectionDividers.position));
      return rows.map(toDivider);
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

      const counts = new Map<number, number>();
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
        .orderBy(asc(collections.position));

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
