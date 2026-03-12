/**
 * Collection Service (v2)
 *
 * Manages collections. Posts belong to collections via post_collections junction table (M:N).
 * Sidebar ordering is managed through the sidebar_items table with fractional indexing.
 */

import { eq, asc, sql, and, inArray, desc } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { generateKeyBetween } from "fractional-indexing";
import { uuidv7 } from "uuidv7";
import { type Database, batchQueryRows } from "../db/index.js";
import {
  collections,
  pathRegistry,
  sidebarItems,
  postCollections,
} from "../db/schema.js";
import { now } from "../lib/time.js";
import type {
  Collection,
  SidebarItem,
  SidebarItemType,
  CreateCollection,
  UpdateCollection,
  SortOrder,
} from "../types.js";
import { ConflictError } from "../lib/errors.js";
import {
  createPathService,
  toCollectionPath,
  type PathService,
} from "./path.js";

const POSITION_RETRY_ATTEMPTS = 5;

function isUniqueConstraintError(err: unknown): boolean {
  let current: unknown = err;
  while (current) {
    const msg = String(current);
    if (
      msg.includes("UNIQUE constraint") ||
      msg.includes("SQLITE_CONSTRAINT")
    ) {
      return true;
    }
    current =
      current instanceof Error && current.cause !== current
        ? current.cause
        : undefined;
  }
  return false;
}

export interface CollectionService {
  getById(id: string): Promise<Collection | null>;
  getBySlug(slug: string): Promise<Collection | null>;
  list(): Promise<Collection[]>;
  /** List collections sorted by most recent post addition (for compose dialog) */
  listByRecentActivity(): Promise<Collection[]>;
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
  /** Batch get collections for multiple posts */
  getCollectionsByPostIds(
    postIds: string[],
  ): Promise<Map<string, Collection[]>>;
  /** Get all post IDs in a collection */
  getPostIds(collectionId: string): Promise<string[]>;
  /** Sync a post's collection memberships (replace all with given IDs) */
  syncPostCollections(postId: string, collectionIds: string[]): Promise<void>;
}

export function createCollectionService(
  db: Database,
  paths: PathService = createPathService(db),
): CollectionService {
  function toCollection(
    row: typeof collections.$inferSelect,
    slug: string,
  ): Collection {
    return {
      id: row.id,
      slug,
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

  async function listOrderedSidebarPositions(excludeId?: string) {
    const rows = await db
      .select({ id: sidebarItems.id, position: sidebarItems.position })
      .from(sidebarItems)
      .orderBy(asc(sidebarItems.position));
    return excludeId ? rows.filter((row) => row.id !== excludeId) : rows;
  }

  async function getAppendSidebarPosition(): Promise<string> {
    const lastPos = await getLastSidebarPosition();
    return generateKeyBetween(lastPos, null);
  }

  async function pathExists(path: string): Promise<boolean> {
    const rows = await db
      .select({ id: pathRegistry.id })
      .from(pathRegistry)
      .where(eq(pathRegistry.path, path))
      .limit(1);
    return rows.length > 0;
  }

  async function getSidebarMovePosition(
    id: string,
    afterId: string | null,
    beforeId: string | null,
  ): Promise<string> {
    const rows = await listOrderedSidebarPositions(id);
    const afterIndex = afterId
      ? rows.findIndex((row) => row.id === afterId)
      : -1;
    if (afterIndex >= 0) {
      return generateKeyBetween(
        rows[afterIndex]?.position ?? null,
        rows[afterIndex + 1]?.position ?? null,
      );
    }

    const beforeIndex = beforeId
      ? rows.findIndex((row) => row.id === beforeId)
      : -1;
    if (beforeIndex >= 0) {
      return generateKeyBetween(
        rows[beforeIndex - 1]?.position ?? null,
        rows[beforeIndex]?.position ?? null,
      );
    }

    return generateKeyBetween(rows.at(-1)?.position ?? null, null);
  }

  async function hydrateCollection(
    row: typeof collections.$inferSelect | undefined,
  ): Promise<Collection | null> {
    if (!row) return null;
    const slug = await paths.getCollectionSlug(row.id);
    if (!slug) return null;
    return toCollection(row, slug);
  }

  async function hydrateCollections(
    rows: (typeof collections.$inferSelect)[],
  ): Promise<Collection[]> {
    if (rows.length === 0) return [];
    const slugMap = await paths.getCollectionSlugMap(rows.map((row) => row.id));
    return rows
      .map((row) => {
        const slug = slugMap.get(row.id);
        return slug ? toCollection(row, slug) : null;
      })
      .filter((row): row is Collection => row !== null);
  }

  return {
    async getById(id) {
      const result = await db
        .select()
        .from(collections)
        .where(eq(collections.id, id))
        .limit(1);
      return hydrateCollection(result[0]);
    },

    async getBySlug(slug) {
      const resolved = await paths.resolve(toCollectionPath(slug));
      if (!resolved || resolved.kind !== "slug" || !resolved.collectionId) {
        return null;
      }
      return this.getById(resolved.collectionId);
    },

    async list() {
      const rows = await db
        .select()
        .from(collections)
        .orderBy(asc(collections.createdAt));
      return hydrateCollections(rows);
    },

    async listByRecentActivity() {
      const lastAddedAt = sql<
        number | null
      >`MAX(${postCollections.createdAt})`.as("last_added_at");
      const rows = await db
        .select({ collection: collections, lastAddedAt })
        .from(collections)
        .leftJoin(
          postCollections,
          eq(collections.id, postCollections.collectionId),
        )
        .groupBy(collections.id)
        .orderBy(desc(sql`last_added_at`), asc(collections.createdAt));
      return hydrateCollections(rows.map((row) => row.collection));
    },

    async create(data) {
      const id = uuidv7();
      const timestamp = now();
      const slugPath = toCollectionPath(data.slug);

      for (let attempt = 0; attempt < POSITION_RETRY_ATTEMPTS; attempt += 1) {
        try {
          const position = await getAppendSidebarPosition();
          const writeQueries: BatchItem<"sqlite">[] = [
            db.insert(collections).values({
              id,
              title: data.title,
              description: data.description ?? null,
              icon: data.icon ?? null,
              sortOrder: data.sortOrder ?? "newest",
              createdAt: timestamp,
              updatedAt: timestamp,
            }),
            db.insert(pathRegistry).values({
              id: uuidv7(),
              path: slugPath,
              kind: "slug",
              postId: null,
              collectionId: id,
              redirectToPath: null,
              redirectType: null,
              createdAt: timestamp,
              updatedAt: timestamp,
            }),
            db.insert(sidebarItems).values({
              id: uuidv7(),
              type: "collection",
              collectionId: id,
              position,
              createdAt: timestamp,
              updatedAt: timestamp,
            }),
          ];

          await db.batch(
            writeQueries as [
              (typeof writeQueries)[number],
              ...(typeof writeQueries)[number][],
            ],
          );

          const collection = await this.getById(id);
          if (!collection) {
            throw new ConflictError(
              `Slug "${data.slug}" could not be resolved`,
            );
          }
          return collection;
        } catch (err) {
          if (err instanceof ConflictError) {
            throw err;
          }
          if (isUniqueConstraintError(err) && (await pathExists(slugPath))) {
            throw new ConflictError(`Slug "${data.slug}" is already in use`);
          }
          if (attempt === POSITION_RETRY_ATTEMPTS - 1) {
            throw err;
          }
        }
      }

      throw new Error("Failed to assign a unique sidebar item position");
    },

    async update(id, data) {
      const existing = await this.getById(id);
      if (!existing) return null;

      if (data.slug !== undefined && data.slug !== existing.slug) {
        try {
          await paths.updateCollectionSlug(id, data.slug);
        } catch (err) {
          if (err instanceof ConflictError) {
            throw new ConflictError(`Slug "${data.slug}" is already in use`);
          }
          throw err;
        }
      }

      const timestamp = now();
      const updates: Partial<typeof collections.$inferInsert> = {
        updatedAt: timestamp,
      };

      if (data.title !== undefined) updates.title = data.title;
      if (data.description !== undefined) {
        updates.description = data.description;
      }
      if (data.icon !== undefined) updates.icon = data.icon;
      if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

      const result = await db
        .update(collections)
        .set(updates)
        .where(eq(collections.id, id))
        .returning();

      return hydrateCollection(result[0]);
    },

    async delete(id) {
      await db
        .delete(postCollections)
        .where(eq(postCollections.collectionId, id));
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

      for (let attempt = 0; attempt < POSITION_RETRY_ATTEMPTS; attempt += 1) {
        try {
          const result = await db
            .insert(sidebarItems)
            .values({
              id,
              type,
              collectionId: collectionId ?? null,
              position: await getAppendSidebarPosition(),
              createdAt: timestamp,
              updatedAt: timestamp,
            })
            .returning();

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
          return toSidebarItem(result[0]!);
        } catch (err) {
          if (
            type === "collection" &&
            collectionId &&
            isUniqueConstraintError(err)
          ) {
            const existing = await db
              .select({ id: sidebarItems.id })
              .from(sidebarItems)
              .where(eq(sidebarItems.collectionId, collectionId))
              .limit(1);
            if (existing.length > 0) {
              throw new ConflictError("Collection is already in the sidebar.");
            }
          }
          if (
            !isUniqueConstraintError(err) ||
            attempt === POSITION_RETRY_ATTEMPTS - 1
          ) {
            throw err;
          }
        }
      }

      throw new Error("Failed to assign a unique sidebar item position");
    },

    async deleteSidebarItem(id) {
      const result = await db
        .delete(sidebarItems)
        .where(eq(sidebarItems.id, id))
        .returning();
      return result.length > 0;
    },

    async moveSidebarItem(id, afterId, beforeId) {
      const items = await db
        .select()
        .from(sidebarItems)
        .where(eq(sidebarItems.id, id))
        .limit(1);
      if (!items[0]) return null;

      const timestamp = now();
      for (let attempt = 0; attempt < POSITION_RETRY_ATTEMPTS; attempt += 1) {
        try {
          const result = await db
            .update(sidebarItems)
            .set({
              position: await getSidebarMovePosition(id, afterId, beforeId),
              updatedAt: timestamp,
            })
            .where(eq(sidebarItems.id, id))
            .returning();

          return result[0] ? toSidebarItem(result[0]) : null;
        } catch (err) {
          if (
            !isUniqueConstraintError(err) ||
            attempt === POSITION_RETRY_ATTEMPTS - 1
          ) {
            throw err;
          }
        }
      }

      throw new Error("Failed to assign a unique sidebar item position");
    },

    async getPostCounts() {
      const rows = await db
        .select({
          collectionId: postCollections.collectionId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(postCollections)
        .innerJoin(
          sql`post`,
          sql`post.id = ${postCollections.postId} AND post.deleted_at IS NULL`,
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
        .values({ postId, collectionId, createdAt: now() })
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

      return hydrateCollections(rows.map((row) => row.collection));
    },

    async getCollectionsByPostIds(postIds) {
      const result = new Map<string, Collection[]>();
      if (postIds.length === 0) return result;

      const rows = await batchQueryRows(postIds, (chunk) =>
        db
          .select({
            postId: postCollections.postId,
            collection: collections,
          })
          .from(postCollections)
          .innerJoin(
            collections,
            eq(postCollections.collectionId, collections.id),
          )
          .where(inArray(postCollections.postId, chunk))
          .orderBy(asc(collections.createdAt)),
      );

      const collectionRows = rows.map((row) => row.collection);
      const slugMap = await paths.getCollectionSlugMap(
        collectionRows.map((row) => row.id),
      );

      for (const row of rows) {
        const slug = slugMap.get(row.collection.id);
        if (!slug) continue;
        const existing = result.get(row.postId) ?? [];
        existing.push(toCollection(row.collection, slug));
        result.set(row.postId, existing);
      }

      return result;
    },

    async getPostIds(collectionId) {
      const rows = await db
        .select({ postId: postCollections.postId })
        .from(postCollections)
        .where(eq(postCollections.collectionId, collectionId));

      return rows.map((row) => row.postId);
    },

    async syncPostCollections(postId, collectionIds) {
      if (collectionIds.length === 0) {
        await db
          .delete(postCollections)
          .where(eq(postCollections.postId, postId));
        return;
      }

      const deleteQuery = db
        .delete(postCollections)
        .where(eq(postCollections.postId, postId));
      const insertQuery = db.insert(postCollections).values(
        collectionIds.map((collectionId) => ({
          postId,
          collectionId,
          createdAt: now(),
        })),
      );
      await db.batch([deleteQuery, insertQuery]);
    },
  };
}
