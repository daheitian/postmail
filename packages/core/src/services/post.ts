/**
 * Post Service (v2)
 *
 * CRUD operations for posts with Thread support.
 * Posts have format (note/link/quote), status (draft/published),
 * featured flag, and pinned flag.
 */

import { eq, and, isNull, desc, or, inArray, sql } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { posts } from "../db/schema.js";
import { now } from "../lib/time.js";
import { render as renderMarkdown } from "../lib/markdown.js";
import type { Format, Status, Post, CreatePost, UpdatePost } from "../types.js";

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
}

export interface PostService {
  getById(id: number): Promise<Post | null>;
  getByPath(path: string): Promise<Post | null>;
  list(filters?: PostFilters): Promise<Post[]>;
  create(data: CreatePost): Promise<Post>;
  update(id: number, data: UpdatePost): Promise<Post | null>;
  delete(id: number): Promise<boolean>;
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

export function createPostService(db: Database): PostService {
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
      collectionId: row.collectionId,
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
        conditions.push(eq(posts.collectionId, filters.collectionId));
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

      if (filters.cursor) {
        conditions.push(sql`${posts.id} < ${filters.cursor}`);
      }

      const query = db
        .select()
        .from(posts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(posts.publishedAt), desc(posts.id))
        .limit(filters.limit ?? 100);

      const rows = await query;
      return rows.map(toPost);
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

      const result = await db
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
          collectionId: data.collectionId ?? null,
          replyToId: data.replyToId ?? null,
          threadId,
          publishedAt: data.publishedAt ?? timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      return toPost(result[0]!);
    },

    async update(id, data) {
      const existing = await this.getById(id);
      if (!existing) return null;

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
      if (data.collectionId !== undefined)
        updates.collectionId = data.collectionId;
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

      // If this is a root post and status/featured changed, cascade to thread
      if ((statusChanged || featuredChanged) && !existing.threadId) {
        await this.updateThreadStatusAndFeatured(
          id,
          data.status ?? (existing.status as Status),
          data.featured !== undefined ? data.featured : existing.featured === 1,
        );
      }

      const result = await db
        .update(posts)
        .set(updates)
        .where(eq(posts.id, id))
        .returning();

      return result[0] ? toPost(result[0]) : null;
    },

    async delete(id) {
      const existing = await this.getById(id);
      if (!existing) return false;

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
