/**
 * Collection Service (v2)
 *
 * Manages collections. Posts belong to collections via post_collections junction table (M:N).
 * Sidebar ordering is managed through the collection_directory_item table with fractional indexing.
 */

import { eq, asc, sql, and, inArray, desc } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import {
  type Database,
  batchQueryRows,
  supportsDrizzleTransaction,
} from "../db/index.js";
import type { DatabaseDialect } from "../db/dialect.js";
import {
  sqliteSchemaBundle,
  type DatabaseSchema,
} from "../db/schema-bundle.js";
import { createEntityId } from "../lib/ids.js";
import { now } from "../lib/time.js";
import type {
  Collection,
  CollectionDirectoryCollection,
  CollectionDirectoryItem,
  CollectionsDirectoryData,
  SidebarItem,
  SidebarItemType,
  CreateCollection,
  UpdateCollection,
  UpdateSidebarItem,
  CollectionSortOrder,
} from "../types.js";
import { ConflictError } from "../lib/errors.js";
import {
  createPathService,
  toCollectionPath,
  type PathService,
} from "./path.js";
import {
  CollectionDescriptionValueSchema,
  CollectionSlugSchema,
  CollectionTitleSchema,
  parseValidated,
} from "../lib/schemas.js";

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
  listDirectoryData(): Promise<CollectionsDirectoryData>;
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
    label?: string | null,
  ): Promise<SidebarItem>;
  /** Delete a sidebar item by ID */
  deleteSidebarItem(id: string): Promise<boolean>;
  /** Update a sidebar item */
  updateSidebarItem(
    id: string,
    data: UpdateSidebarItem,
  ): Promise<SidebarItem | null>;
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
  siteId: string,
  paths: PathService | undefined,
  databaseSchema: DatabaseSchema = sqliteSchemaBundle,
  databaseDialect: DatabaseDialect = "sqlite",
): CollectionService {
  const resolvedPaths = paths ?? createPathService(db, siteId, databaseSchema);
  const {
    collections,
    pathRegistry,
    collectionDirectoryItems: sidebarItems,
    postCollections,
    posts,
  } = databaseSchema;
  const usesBatchWrites = !supportsDrizzleTransaction(db, databaseDialect);

  function normalizeCreateCollectionInput(
    data: CreateCollection,
  ): CreateCollection {
    return {
      slug: parseValidated(CollectionSlugSchema, data.slug),
      title: parseValidated(CollectionTitleSchema, data.title),
      description:
        data.description === undefined
          ? undefined
          : parseValidated(CollectionDescriptionValueSchema, data.description),
      sortOrder: data.sortOrder,
    };
  }

  function normalizeUpdateCollectionInput(
    data: UpdateCollection,
  ): UpdateCollection {
    const normalized: UpdateCollection = {};

    if (data.slug !== undefined) {
      normalized.slug = parseValidated(CollectionSlugSchema, data.slug);
    }
    if (data.title !== undefined) {
      normalized.title = parseValidated(CollectionTitleSchema, data.title);
    }
    if (data.description !== undefined) {
      normalized.description =
        data.description === null
          ? null
          : parseValidated(CollectionDescriptionValueSchema, data.description);
    }
    if (data.sortOrder !== undefined) {
      normalized.sortOrder = data.sortOrder;
    }

    return normalized;
  }

  function toCollection(
    row: typeof collections.$inferSelect,
    slug: string,
  ): Collection {
    return {
      id: row.id,
      siteId: row.siteId,
      slug,
      title: row.title,
      description: row.description,
      sortOrder: row.sortOrder as CollectionSortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  function toSidebarItem(row: typeof sidebarItems.$inferSelect): SidebarItem {
    return {
      id: row.id,
      siteId: row.siteId,
      type: row.type as SidebarItemType,
      collectionId: row.collectionId,
      label: row.label,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  function normalizeSidebarLabel(label?: string | null): string | null {
    const trimmed = label?.trim();
    return trimmed ? trimmed : null;
  }

  async function getLastSidebarPosition(): Promise<string | null> {
    const rows = await db
      .select({ position: sidebarItems.position })
      .from(sidebarItems)
      .where(eq(sidebarItems.siteId, siteId))
      .orderBy(sql`${sidebarItems.position} DESC`)
      .limit(1);
    return rows[0]?.position ?? null;
  }

  async function listOrderedSidebarPositions(excludeId?: string) {
    const rows = await db
      .select({ id: sidebarItems.id, position: sidebarItems.position })
      .from(sidebarItems)
      .where(eq(sidebarItems.siteId, siteId))
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
      .where(and(eq(pathRegistry.siteId, siteId), eq(pathRegistry.path, path)))
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
    const slug = await resolvedPaths.getCollectionSlug(row.id);
    if (!slug) return null;
    return toCollection(row, slug);
  }

  async function hydrateCollections(
    rows: (typeof collections.$inferSelect)[],
  ): Promise<Collection[]> {
    if (rows.length === 0) return [];
    const slugMap = await resolvedPaths.getCollectionSlugMap(
      rows.map((row) => row.id),
    );
    return rows
      .map((row) => {
        const slug = slugMap.get(row.id);
        return slug ? toCollection(row, slug) : null;
      })
      .filter((row): row is Collection => row !== null);
  }

  async function getPostCollectionIds(postId: string): Promise<string[]> {
    const rows = await db
      .select({ collectionId: postCollections.collectionId })
      .from(postCollections)
      .where(
        and(
          eq(postCollections.siteId, siteId),
          eq(postCollections.postId, postId),
        ),
      );

    return rows.map((row) => row.collectionId);
  }

  async function listDirectoryCollections(): Promise<
    CollectionDirectoryCollection[]
  > {
    const postCount = sql<number>`
      COUNT(
        CASE
          WHEN ${posts.id} IS NOT NULL AND ${posts.deletedAt} IS NULL THEN 1
        END
      )
    `.as("post_count");
    const recentActivityAt = sql<number | null>`
      MAX(
        CASE
          WHEN ${posts.id} IS NOT NULL AND ${posts.deletedAt} IS NULL
          THEN COALESCE(
            ${posts.lastActivityAt},
            ${posts.publishedAt},
            ${posts.updatedAt}
          )
        END
      )
    `.as("recent_activity_at");

    const rows = await db
      .select({
        collection: collections,
        postCount,
        recentActivityAt,
      })
      .from(collections)
      .leftJoin(
        postCollections,
        and(
          eq(postCollections.siteId, siteId),
          eq(collections.id, postCollections.collectionId),
        ),
      )
      .leftJoin(
        posts,
        and(eq(posts.siteId, siteId), eq(postCollections.postId, posts.id)),
      )
      .where(eq(collections.siteId, siteId))
      .groupBy(collections.id)
      .orderBy(asc(collections.createdAt));

    if (rows.length === 0) return [];

    const slugMap = await resolvedPaths.getCollectionSlugMap(
      rows.map((row) => row.collection.id),
    );

    return rows
      .map((row) => {
        const slug = slugMap.get(row.collection.id);
        if (!slug) return null;

        return {
          ...toCollection(row.collection, slug),
          postCount: row.postCount,
          recentActivityAt: row.recentActivityAt ?? row.collection.updatedAt,
        };
      })
      .filter((row): row is CollectionDirectoryCollection => row !== null);
  }

  function buildDirectoryItems(
    directoryCollections: CollectionDirectoryCollection[],
    orderedSidebarItems: SidebarItem[],
  ): CollectionDirectoryItem[] {
    const collectionMap = new Map(
      directoryCollections.map((collection) => [collection.id, collection]),
    );
    const seenCollections = new Set<string>();
    const items: CollectionDirectoryItem[] = [];

    for (const item of orderedSidebarItems) {
      if (item.type === "divider") {
        items.push({
          id: item.id,
          type: "divider",
          label: item.label,
        });
        continue;
      }

      const collection = item.collectionId
        ? collectionMap.get(item.collectionId)
        : undefined;
      if (!collection) continue;

      seenCollections.add(collection.id);
      items.push({
        id: item.id,
        type: "collection",
        collection,
      });
    }

    for (const collection of directoryCollections) {
      if (seenCollections.has(collection.id)) continue;
      items.push({
        id: collection.id,
        type: "collection",
        collection,
      });
    }

    return items;
  }

  return {
    async getById(id) {
      const result = await db
        .select()
        .from(collections)
        .where(and(eq(collections.siteId, siteId), eq(collections.id, id)))
        .limit(1);
      return hydrateCollection(result[0]);
    },

    async getBySlug(slug) {
      const resolved = await resolvedPaths.resolve(toCollectionPath(slug));
      if (!resolved || resolved.kind !== "slug" || !resolved.collectionId) {
        return null;
      }
      return this.getById(resolved.collectionId);
    },

    async list() {
      const rows = await db
        .select()
        .from(collections)
        .where(eq(collections.siteId, siteId))
        .orderBy(asc(collections.createdAt));
      return hydrateCollections(rows);
    },

    async listDirectoryData() {
      const [directoryCollections, orderedSidebarItems] = await Promise.all([
        listDirectoryCollections(),
        this.listSidebarItems(),
      ]);

      return {
        collections: directoryCollections,
        items: buildDirectoryItems(directoryCollections, orderedSidebarItems),
        sidebarItems: orderedSidebarItems,
      };
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
          and(
            eq(postCollections.siteId, siteId),
            eq(collections.id, postCollections.collectionId),
          ),
        )
        .where(eq(collections.siteId, siteId))
        .groupBy(collections.id)
        .orderBy(desc(sql`last_added_at`), desc(collections.createdAt));
      return hydrateCollections(rows.map((row) => row.collection));
    },

    async create(data) {
      const normalizedData = normalizeCreateCollectionInput(data);
      const id = createEntityId("collection");
      const timestamp = now();
      const slugPath = toCollectionPath(normalizedData.slug);

      for (let attempt = 0; attempt < POSITION_RETRY_ATTEMPTS; attempt += 1) {
        try {
          const position = await getAppendSidebarPosition();
          if (usesBatchWrites) {
            const writeQueries = [
              db.insert(collections).values({
                id,
                siteId,
                title: normalizedData.title,
                description: normalizedData.description ?? null,
                sortOrder: normalizedData.sortOrder ?? "newest",
                createdAt: timestamp,
                updatedAt: timestamp,
              }),
              db.insert(pathRegistry).values({
                id: createEntityId("path"),
                siteId,
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
                id: createEntityId("collectionDirectoryItem"),
                siteId,
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
          } else {
            await db.transaction(async (tx) => {
              await tx.insert(collections).values({
                id,
                siteId,
                title: normalizedData.title,
                description: normalizedData.description ?? null,
                sortOrder: normalizedData.sortOrder ?? "newest",
                createdAt: timestamp,
                updatedAt: timestamp,
              });

              await tx.insert(pathRegistry).values({
                id: createEntityId("path"),
                siteId,
                path: slugPath,
                kind: "slug",
                postId: null,
                collectionId: id,
                redirectToPath: null,
                redirectType: null,
                createdAt: timestamp,
                updatedAt: timestamp,
              });

              await tx.insert(sidebarItems).values({
                id: createEntityId("collectionDirectoryItem"),
                siteId,
                type: "collection",
                collectionId: id,
                position,
                createdAt: timestamp,
                updatedAt: timestamp,
              });
            });
          }

          const collection = await this.getById(id);
          if (!collection) {
            throw new ConflictError(
              `Slug "${normalizedData.slug}" could not be resolved`,
            );
          }
          return collection;
        } catch (err) {
          if (err instanceof ConflictError) {
            throw err;
          }
          if (isUniqueConstraintError(err) && (await pathExists(slugPath))) {
            throw new ConflictError(
              `Slug "${normalizedData.slug}" is already in use`,
            );
          }
          if (attempt === POSITION_RETRY_ATTEMPTS - 1) {
            throw err;
          }
        }
      }

      throw new Error("Failed to assign a unique sidebar item position");
    },

    async update(id, data) {
      const normalizedData = normalizeUpdateCollectionInput(data);
      const existing = await this.getById(id);
      if (!existing) return null;

      if (
        normalizedData.slug !== undefined &&
        normalizedData.slug !== existing.slug
      ) {
        try {
          await resolvedPaths.updateCollectionSlug(id, normalizedData.slug);
        } catch (err) {
          if (err instanceof ConflictError) {
            throw new ConflictError(
              `Slug "${normalizedData.slug}" is already in use`,
            );
          }
          throw err;
        }
      }

      const timestamp = now();
      const updates: Partial<typeof collections.$inferInsert> = {
        updatedAt: timestamp,
      };

      if (normalizedData.title !== undefined) {
        updates.title = normalizedData.title;
      }
      if (normalizedData.description !== undefined) {
        updates.description = normalizedData.description;
      }
      if (normalizedData.sortOrder !== undefined) {
        updates.sortOrder = normalizedData.sortOrder;
      }

      const result = await db
        .update(collections)
        .set(updates)
        .where(and(eq(collections.siteId, siteId), eq(collections.id, id)))
        .returning();

      return hydrateCollection(result[0]);
    },

    async delete(id) {
      await db
        .delete(postCollections)
        .where(
          and(
            eq(postCollections.siteId, siteId),
            eq(postCollections.collectionId, id),
          ),
        );
      await db
        .delete(sidebarItems)
        .where(
          and(
            eq(sidebarItems.siteId, siteId),
            eq(sidebarItems.collectionId, id),
          ),
        );
      const result = await db
        .delete(collections)
        .where(and(eq(collections.siteId, siteId), eq(collections.id, id)))
        .returning();
      return result.length > 0;
    },

    async listSidebarItems() {
      const rows = await db
        .select()
        .from(sidebarItems)
        .where(eq(sidebarItems.siteId, siteId))
        .orderBy(asc(sidebarItems.position));
      return rows.map(toSidebarItem);
    },

    async createSidebarItem(type, collectionId, label) {
      const id = createEntityId("collectionDirectoryItem");
      const timestamp = now();
      const normalizedLabel =
        type === "divider" ? normalizeSidebarLabel(label) : null;

      for (let attempt = 0; attempt < POSITION_RETRY_ATTEMPTS; attempt += 1) {
        try {
          const result = await db
            .insert(sidebarItems)
            .values({
              id,
              siteId,
              type,
              collectionId: collectionId ?? null,
              label: normalizedLabel,
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
              .where(
                and(
                  eq(sidebarItems.siteId, siteId),
                  eq(sidebarItems.collectionId, collectionId),
                ),
              )
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
        .where(and(eq(sidebarItems.siteId, siteId), eq(sidebarItems.id, id)))
        .returning();
      return result.length > 0;
    },

    async updateSidebarItem(id, data) {
      const existing = await db
        .select()
        .from(sidebarItems)
        .where(and(eq(sidebarItems.siteId, siteId), eq(sidebarItems.id, id)))
        .limit(1);
      const item = existing[0];
      if (!item) return null;

      if (data.label === undefined) {
        return toSidebarItem(item);
      }

      const result = await db
        .update(sidebarItems)
        .set({
          label:
            item.type === "divider" ? normalizeSidebarLabel(data.label) : null,
          updatedAt: now(),
        })
        .where(and(eq(sidebarItems.siteId, siteId), eq(sidebarItems.id, id)))
        .returning();

      return result[0] ? toSidebarItem(result[0]) : null;
    },

    async moveSidebarItem(id, afterId, beforeId) {
      const items = await db
        .select()
        .from(sidebarItems)
        .where(and(eq(sidebarItems.siteId, siteId), eq(sidebarItems.id, id)))
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
            .where(
              and(eq(sidebarItems.siteId, siteId), eq(sidebarItems.id, id)),
            )
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
          sql`post.id = ${postCollections.postId} AND post.deleted_at IS NULL AND post.site_id = ${siteId}`,
        )
        .where(eq(postCollections.siteId, siteId))
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
        .values({ siteId, postId, collectionId, createdAt: now() })
        .onConflictDoNothing();
    },

    async removePost(collectionId, postId) {
      await db
        .delete(postCollections)
        .where(
          and(
            eq(postCollections.siteId, siteId),
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
        .where(
          and(
            eq(postCollections.siteId, siteId),
            eq(collections.siteId, siteId),
            eq(postCollections.postId, postId),
          ),
        )
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
          .where(
            and(
              eq(postCollections.siteId, siteId),
              eq(collections.siteId, siteId),
              inArray(postCollections.postId, chunk),
            ),
          )
          .orderBy(asc(collections.createdAt)),
      );

      const collectionRows = rows.map((row) => row.collection);
      const slugMap = await resolvedPaths.getCollectionSlugMap(
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
        .where(
          and(
            eq(postCollections.siteId, siteId),
            eq(postCollections.collectionId, collectionId),
          ),
        );

      return rows.map((row) => row.postId);
    },

    async syncPostCollections(postId, collectionIds) {
      const nextCollectionIds = [...new Set(collectionIds)];
      const existingCollectionIds = await getPostCollectionIds(postId);
      const existingIds = new Set(existingCollectionIds);
      const nextIds = new Set(nextCollectionIds);
      const removedIds = existingCollectionIds.filter((id) => !nextIds.has(id));
      const addedIds = nextCollectionIds.filter((id) => !existingIds.has(id));

      if (removedIds.length === 0 && addedIds.length === 0) {
        return;
      }

      if (usesBatchWrites) {
        const writeQueries = [];

        if (removedIds.length > 0) {
          writeQueries.push(
            db
              .delete(postCollections)
              .where(
                and(
                  eq(postCollections.siteId, siteId),
                  eq(postCollections.postId, postId),
                  inArray(postCollections.collectionId, removedIds),
                ),
              ),
          );
        }

        if (addedIds.length > 0) {
          const timestamp = now();
          writeQueries.push(
            db.insert(postCollections).values(
              addedIds.map((collectionId) => ({
                siteId,
                postId,
                collectionId,
                createdAt: timestamp,
              })),
            ),
          );
        }

        await db.batch(
          writeQueries as [
            (typeof writeQueries)[number],
            ...(typeof writeQueries)[number][],
          ],
        );
        return;
      }

      await db.transaction(async (tx) => {
        if (removedIds.length > 0) {
          await tx
            .delete(postCollections)
            .where(
              and(
                eq(postCollections.siteId, siteId),
                eq(postCollections.postId, postId),
                inArray(postCollections.collectionId, removedIds),
              ),
            );
        }

        if (addedIds.length > 0) {
          const timestamp = now();
          await tx.insert(postCollections).values(
            addedIds.map((collectionId) => ({
              siteId,
              postId,
              collectionId,
              createdAt: timestamp,
            })),
          );
        }
      });
    },
  };
}
