/**
 * Collection Service (v2)
 *
 * Manages collections. Posts belong to collections via posts.collection_id (1:M).
 */

import { eq, asc, sql, desc } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { collections, posts } from "../db/schema.js";
import { now } from "../lib/time.js";
import type {
  Collection,
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
  /** Get post count per collection */
  getPostCounts(): Promise<Map<number, number>>;
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
      showDivider: row.showDivider,
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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- aggregate always returns one row
        position = maxResult[0]!.maxPos + 1;
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
          showDivider: data.showDivider ? 1 : 0,
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
      if (data.showDivider !== undefined)
        updates.showDivider = data.showDivider ? 1 : 0;

      const result = await db
        .update(collections)
        .set(updates)
        .where(eq(collections.id, id))
        .returning();

      return result[0] ? toCollection(result[0]) : null;
    },

    async delete(id) {
      // Clear collection_id on posts that belong to this collection
      await db
        .update(posts)
        .set({ collectionId: null })
        .where(eq(posts.collectionId, id));

      const result = await db
        .delete(collections)
        .where(eq(collections.id, id))
        .returning();
      return result.length > 0;
    },

    async reorder(ids) {
      const timestamp = now();
      for (let i = 0; i < ids.length; i++) {
        await db
          .update(collections)
          .set({ position: i, updatedAt: timestamp })
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- loop index guarantees element exists
          .where(eq(collections.id, ids[i]!));
      }
    },

    async getPostCounts() {
      const rows = await db
        .select({
          collectionId: posts.collectionId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(posts)
        .where(
          sql`${posts.collectionId} IS NOT NULL AND ${posts.deletedAt} IS NULL`,
        )
        .groupBy(posts.collectionId);

      const counts = new Map<number, number>();
      for (const row of rows) {
        if (row.collectionId !== null) {
          counts.set(row.collectionId, row.count);
        }
      }
      return counts;
    },
  };
}
