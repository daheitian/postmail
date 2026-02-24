/**
 * Post Service (v2)
 *
 * CRUD operations for posts with Thread support.
 * Posts have format (note/link/quote), status (draft/published),
 * featured flag, and pinned flag.
 */

import { eq, and, isNull, desc, or, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "../db/index.js";
import { posts, postCollections } from "../db/schema.js";
import { now } from "../lib/time.js";
import { render as renderMarkdown } from "../lib/markdown.js";
import type { StorageDriver } from "../lib/storage.js";
import type { MediaService } from "./media.js";
import type { Format, Status, Post, CreatePost, UpdatePost } from "../types.js";
import type { PathRegistryService } from "./path-registry.js";
import { ConflictError } from "../lib/errors.js";

/** Dependencies for operations that coordinate with other services */
export interface PostDeleteDeps {
  media: MediaService;
  storage?: StorageDriver | null;
}

export interface PostFilters {
  format?: Format;
  status?: Status;
  featured?: boolean;
  pinned?: boolean;
  collectionId?: number;
  /** Exclude posts that are replies (have threadId set) */
  excludeReplies?: boolean;
  includeDeleted?: boolean;
  threadId?: number;
  limit?: number;
  cursor?: number; // post id for cursor pagination
  offset?: number; // offset for page-based pagination
}

export interface PostService {
  getById(id: number): Promise<Post | null>;
  getByPath(path: string): Promise<Post | null>;
  list(filters?: PostFilters): Promise<Post[]>;
  /** Count posts matching filters (ignores cursor, offset, limit) */
  count(filters?: PostFilters): Promise<number>;
  create(data: CreatePost): Promise<Post>;
  update(id: number, data: UpdatePost): Promise<Post | null>;
  /**
   * Soft-delete a post and clean up its media (storage files + DB records).
   * Thread roots cascade to all replies.
   *
   * @param id - Post ID
   * @param deps - Media service and optional storage driver for file cleanup
   */
  delete(id: number, deps?: PostDeleteDeps): Promise<boolean>;
  getThread(rootId: number): Promise<Post[]>;
  updateThreadStatusAndFeatured(
    rootId: number,
    status: Status,
    featured: boolean,
  ): Promise<void>;
  /** Get reply counts for multiple posts */
  getReplyCounts(postIds: number[]): Promise<Map<number, number>>;
  /** Get preview replies for multiple thread roots */
  getThreadPreviews(
    rootIds: number[],
    previewCount?: number,
  ): Promise<Map<number, Post[]>>;
}

/** Check if an error is a SQLite UNIQUE constraint violation (D1 or better-sqlite3) */
function isUniqueConstraintError(err: unknown): boolean {
  const msg = String(err);
  return msg.includes("UNIQUE constraint") || msg.includes("SQLITE_CONSTRAINT");
}

export function createPostService(
  db: Database,
  pathRegistry: PathRegistryService,
): PostService {
  /** Build WHERE conditions from filters (shared by list and count) */
  function buildFilterConditions(filters: PostFilters) {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(posts.status, filters.status));
    }
    if (filters.featured !== undefined) {
      conditions.push(eq(posts.featured, filters.featured ? 1 : 0));
    }
    if (filters.pinned !== undefined) {
      conditions.push(eq(posts.pinned, filters.pinned ? 1 : 0));
    }
    if (filters.format) {
      conditions.push(eq(posts.format, filters.format));
    }
    if (filters.collectionId !== undefined) {
      // Filter by collection via junction table
      conditions.push(
        sql`${posts.id} IN (SELECT post_id FROM post_collections WHERE collection_id = ${filters.collectionId})`,
      );
    }
    if (filters.threadId) {
      conditions.push(eq(posts.threadId, filters.threadId));
    }
    if (filters.excludeReplies) {
      conditions.push(isNull(posts.threadId));
    }
    if (!filters.includeDeleted) {
      conditions.push(isNull(posts.deletedAt));
    }

    return conditions;
  }

  function toPost(row: typeof posts.$inferSelect): Post {
    return {
      id: row.id,
      format: row.format as Format,
      status: row.status as Status,
      featured: row.featured,
      pinned: row.pinned,
      path: row.path,
      title: row.title,
      url: row.url,
      body: row.body,
      bodyHtml: row.bodyHtml,
      quoteText: row.quoteText,
      rating: row.rating,
      replyToId: row.replyToId,
      threadId: row.threadId,
      deletedAt: row.deletedAt,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  return {
    async getById(id) {
      const result = await db
        .select()
        .from(posts)
        .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
        .limit(1);
      return result[0] ? toPost(result[0]) : null;
    },

    async getByPath(path) {
      const result = await db
        .select()
        .from(posts)
        .where(and(eq(posts.path, path), isNull(posts.deletedAt)))
        .limit(1);
      return result[0] ? toPost(result[0]) : null;
    },

    async list(filters = {}) {
      const conditions = buildFilterConditions(filters);

      if (filters.cursor) {
        conditions.push(sql`${posts.id} < ${filters.cursor}`);
      }

      let query = db
        .select()
        .from(posts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(posts.publishedAt), desc(posts.id))
        .limit(filters.limit ?? 100);

      if (filters.offset !== undefined) {
        query = query.offset(filters.offset) as typeof query;
      }

      const rows = await query;
      return rows.map(toPost);
    },

    async count(filters = {}) {
      const conditions = buildFilterConditions(filters);

      const result = await db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(posts)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return result[0]?.count ?? 0;
    },

    async create(data) {
      const timestamp = now();

      const bodyHtml = data.body ? renderMarkdown(data.body) : null;

      // Handle thread relationship
      let threadId: number | null = null;
      let status: Status = data.status ?? "published";
      let featured = data.featured ?? false;

      if (data.replyToId) {
        const parent = await this.getById(data.replyToId);
        if (parent) {
          threadId = parent.threadId ?? parent.id;
          // Inherit status and featured from root
          const root = parent.threadId
            ? await this.getById(parent.threadId)
            : parent;
          if (root) {
            status = root.status as Status;
            featured = root.featured === 1;
          }
        }
      }

      // Validate path availability before DB insert — throws friendly
      // ConflictError/ValidationError instead of a raw UNIQUE constraint error.
      // Uses placeholder owner ID; corrected to real ID after insert.
      if (data.path) {
        await pathRegistry.claim(data.path, "post", 0);
      }

      let result;
      try {
        result = await db
          .insert(posts)
          .values({
            format: data.format,
            status,
            featured: featured ? 1 : 0,
            pinned: data.pinned ? 1 : 0,
            path: data.path ?? null,
            title: data.title ?? null,
            url: data.url ?? null,
            body: data.body ?? null,
            bodyHtml,
            quoteText: data.quoteText ?? null,
            rating: data.rating ?? null,
            replyToId: data.replyToId ?? null,
            threadId,
            publishedAt: data.publishedAt ?? timestamp,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .returning();
      } catch (err) {
        if (data.path) await pathRegistry.release(data.path);
        if (isUniqueConstraintError(err)) {
          throw new ConflictError(`Path "${data.path}" is already in use`);
        }
        throw err;
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      const post = toPost(result[0]!);

      // Update registry with actual post ID
      if (post.path) {
        await pathRegistry.release(post.path);
        await pathRegistry.claim(post.path, "post", post.id);
      }

      // Sync collection memberships if provided
      if (data.collectionIds && data.collectionIds.length > 0) {
        await db.insert(postCollections).values(
          data.collectionIds.map((collectionId) => ({
            postId: post.id,
            collectionId,
          })),
        );
      }

      return post;
    },

    async update(id, data) {
      const existing = await this.getById(id);
      if (!existing) return null;

      // Handle path changes in the registry before modifying the post
      const pathChanging =
        data.path !== undefined && data.path !== existing.path;
      if (pathChanging) {
        // Claim new path (if non-null) before releasing old
        if (data.path) {
          await pathRegistry.claim(data.path, "post", id);
        }
        // Release old path (if it existed)
        if (existing.path) {
          await pathRegistry.release(existing.path);
        }
      }

      const timestamp = now();
      const updates: Partial<typeof posts.$inferInsert> = {
        updatedAt: timestamp,
      };

      if (data.format !== undefined) updates.format = data.format;
      if (data.path !== undefined) updates.path = data.path;
      if (data.title !== undefined) updates.title = data.title;
      if (data.url !== undefined) updates.url = data.url;
      if (data.quoteText !== undefined) updates.quoteText = data.quoteText;
      if (data.rating !== undefined) updates.rating = data.rating;
      if (data.publishedAt !== undefined)
        updates.publishedAt = data.publishedAt;
      if (data.pinned !== undefined) updates.pinned = data.pinned ? 1 : 0;

      if (data.body !== undefined) {
        updates.body = data.body;
        updates.bodyHtml = data.body ? renderMarkdown(data.body) : null;
      }

      // Handle status/featured change - cascade to thread if this is root
      const statusChanged =
        data.status !== undefined && data.status !== existing.status;
      const featuredChanged =
        data.featured !== undefined &&
        (data.featured ? 1 : 0) !== existing.featured;

      if (statusChanged) updates.status = data.status;
      if (featuredChanged) updates.featured = data.featured ? 1 : 0;

      // Build all write queries for atomic execution via D1 batch
      const needsCascade =
        (statusChanged || featuredChanged) && !existing.threadId;
      const needsCollectionSync = data.collectionIds !== undefined;
      const hasExtraWrites = needsCascade || needsCollectionSync;

      if (!hasExtraWrites) {
        // Simple case: only the post update
        const result = await db
          .update(posts)
          .set(updates)
          .where(eq(posts.id, id))
          .returning();
        return result[0] ? toPost(result[0]) : null;
      }

      // Complex case: batch cascade + update + collection sync atomically
      const writeQueries: BatchItem<"sqlite">[] = [];

      if (needsCascade) {
        writeQueries.push(
          db
            .update(posts)
            .set({
              status: data.status ?? (existing.status as Status),
              featured: (
                data.featured !== undefined
                  ? data.featured
                  : existing.featured === 1
              )
                ? 1
                : 0,
              updatedAt: timestamp,
            })
            .where(eq(posts.threadId, id)),
        );
      }

      // Post update is always present; track its index for result extraction
      const updateIdx = writeQueries.length;
      writeQueries.push(
        db.update(posts).set(updates).where(eq(posts.id, id)).returning(),
      );

      if (needsCollectionSync) {
        writeQueries.push(
          db.delete(postCollections).where(eq(postCollections.postId, id)),
        );
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guarded by needsCollectionSync
        if (data.collectionIds!.length > 0) {
          writeQueries.push(
            db.insert(postCollections).values(
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guarded by needsCollectionSync
              data.collectionIds!.map((collectionId) => ({
                postId: id,
                collectionId,
              })),
            ),
          );
        }
      }

      const results = await db.batch(
        writeQueries as [
          (typeof writeQueries)[number],
          ...(typeof writeQueries)[number][],
        ],
      );
      const updateResult = results[updateIdx] as
        | (typeof posts.$inferSelect)[]
        | undefined;
      return updateResult?.[0] ? toPost(updateResult[0]) : null;
    },

    async delete(id, deps) {
      const existing = await this.getById(id);
      if (!existing) return false;

      // Clean up media for all affected posts
      if (deps?.media) {
        let postIds: number[];
        if (!existing.threadId) {
          const thread = await this.getThread(id);
          postIds = thread.map((p) => p.id);
        } else {
          postIds = [id];
        }

        const mediaMap = await deps.media.getByPostIds(postIds);
        const allMedia = [...mediaMap.values()].flat();
        if (allMedia.length > 0) {
          await deps.media.deleteByIds(
            allMedia.map((m) => m.id),
            deps.storage,
          );
        }
      }

      // Release paths from registry
      if (!existing.threadId) {
        // Thread root: release paths for all posts in thread
        const thread = await this.getThread(id);
        for (const post of thread) {
          if (post.path) {
            await pathRegistry.release(post.path);
          }
        }
      } else if (existing.path) {
        await pathRegistry.release(existing.path);
      }

      const timestamp = now();

      // If this is a thread root, soft delete all posts in the thread
      if (!existing.threadId) {
        await db
          .update(posts)
          .set({ deletedAt: timestamp, updatedAt: timestamp })
          .where(or(eq(posts.id, id), eq(posts.threadId, id)));
      } else {
        await db
          .update(posts)
          .set({ deletedAt: timestamp, updatedAt: timestamp })
          .where(eq(posts.id, id));
      }

      return true;
    },

    async getThread(rootId) {
      const rows = await db
        .select()
        .from(posts)
        .where(
          and(
            or(eq(posts.id, rootId), eq(posts.threadId, rootId)),
            isNull(posts.deletedAt),
          ),
        )
        .orderBy(posts.createdAt);

      return rows.map(toPost);
    },

    async updateThreadStatusAndFeatured(rootId, status, featured) {
      const timestamp = now();
      await db
        .update(posts)
        .set({ status, featured: featured ? 1 : 0, updatedAt: timestamp })
        .where(eq(posts.threadId, rootId));
    },

    async getReplyCounts(postIds) {
      if (postIds.length === 0) return new Map();

      const rows = await db
        .select({
          threadId: posts.threadId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(posts)
        .where(and(inArray(posts.threadId, postIds), isNull(posts.deletedAt)))
        .groupBy(posts.threadId);

      const counts = new Map<number, number>();
      for (const row of rows) {
        if (row.threadId !== null) {
          counts.set(row.threadId, row.count);
        }
      }
      return counts;
    },

    async getThreadPreviews(rootIds, previewCount = 3) {
      if (rootIds.length === 0) return new Map();

      const rows = await db
        .select()
        .from(posts)
        .where(and(inArray(posts.threadId, rootIds), isNull(posts.deletedAt)))
        .orderBy(posts.threadId, posts.createdAt);

      const result = new Map<number, Post[]>();
      for (const row of rows) {
        const post = toPost(row);
        if (post.threadId === null) continue;
        const list = result.get(post.threadId);
        if (list) {
          if (list.length < previewCount) {
            list.push(post);
          }
        } else {
          result.set(post.threadId, [post]);
        }
      }
      return result;
    },
  };
}
