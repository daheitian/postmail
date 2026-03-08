/**
 * Post Service (v2)
 *
 * CRUD operations for posts with Thread support.
 * Posts have format (note/link/quote), status (draft/published),
 * visibility (public/featured/unlisted), and pinnedAt timestamp.
 */

import { eq, and, isNull, desc, or, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { uuidv7 } from "uuidv7";
import type { Database } from "../db/index.js";
import { posts, postCollections, customUrls } from "../db/schema.js";
import { now } from "../lib/time.js";
import { renderTiptapJson } from "../lib/tiptap-render.js";
import { extractSummary, extractBodyText } from "../lib/summary.js";
import { generatePostSlug } from "../lib/slug.js";
import type { StorageDriver } from "../lib/storage.js";
import type { MediaService } from "./media.js";
import type {
  Format,
  Status,
  Visibility,
  MediaKind,
  Post,
  CreatePost,
  UpdatePost,
  ThreadTimelineContext,
} from "../types.js";
import { ConflictError } from "../lib/errors.js";

/** Dependencies for operations that coordinate with other services */
export interface PostDeleteDeps {
  media: MediaService;
  storage?: StorageDriver | null;
}

export interface PostFilters {
  format?: Format;
  status?: Status;
  visibility?: Visibility;
  pinned?: boolean;
  collectionId?: string;
  /** Exclude posts that are replies (have threadId set) */
  excludeReplies?: boolean;
  /** Exclude unlisted posts from results */
  excludeUnlisted?: boolean;
  /** Exclude private posts from results */
  excludePrivate?: boolean;
  includeDeleted?: boolean;
  threadId?: string;
  /** Unix timestamp (inclusive) — only posts published at or after this time */
  publishedAfter?: number;
  /** Unix timestamp (exclusive) — only posts published before this time */
  publishedBefore?: number;
  /** Media kinds to filter by (OR logic: post has media of ANY selected kind). */
  mediaKinds?: MediaKind[];
  /** Filter by title presence */
  hasTitle?: boolean;
  limit?: number;
  cursor?: string; // post id for cursor pagination (UUIDv7 sorts chronologically)
  offset?: number; // offset for page-based pagination
}

/** Config for automatic summary extraction */
export interface SummaryConfig {
  maxParagraphs: number;
  maxChars: number;
}

export interface PostService {
  getById(id: string): Promise<Post | null>;
  getBySlug(slug: string): Promise<Post | null>;
  list(filters?: PostFilters): Promise<Post[]>;
  /** Count posts matching filters (ignores cursor, offset, limit) */
  count(filters?: PostFilters): Promise<number>;
  create(data: CreatePost, summaryConfig?: SummaryConfig): Promise<Post>;
  update(
    id: string,
    data: UpdatePost,
    summaryConfig?: SummaryConfig,
  ): Promise<Post | null>;
  /**
   * Soft-delete a post and clean up its media (storage files + DB records).
   * Thread roots cascade to all replies.
   *
   * @param id - Post ID
   * @param deps - Media service and optional storage driver for file cleanup
   */
  delete(id: string, deps?: PostDeleteDeps): Promise<boolean>;
  getThread(rootId: string): Promise<Post[]>;
  updateThreadStatusAndVisibility(
    rootId: string,
    status: Status,
    visibility: Visibility,
  ): Promise<void>;
  /** Get reply counts for multiple posts */
  getReplyCounts(postIds: string[]): Promise<Map<string, number>>;
  /** Get preview replies for multiple thread roots */
  getThreadPreviews(
    rootIds: string[],
    previewCount?: number,
  ): Promise<Map<string, Post[]>>;
  /** Get latest-reply context for multiple thread roots (for timeline display) */
  getThreadTimelineContext(
    rootIds: string[],
  ): Promise<Map<string, ThreadTimelineContext>>;
  /** Get distinct years that have published posts */
  getDistinctYears(filters?: PostFilters): Promise<number[]>;
}

/** Check if an error (or any of its causes) is a SQLite UNIQUE constraint violation */
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

export function createPostService(
  db: Database,
  config: { slugIdLength: number },
): PostService {
  /** Check if a slug is available (not used by posts or custom_urls) */
  async function isSlugAvailable(slug: string): Promise<boolean> {
    const existingPost = await db
      .select()
      .from(posts)
      .where(and(eq(posts.slug, slug), isNull(posts.deletedAt)))
      .limit(1);
    if (existingPost.length > 0) return false;

    const existingCustomUrl = await db
      .select()
      .from(customUrls)
      .where(eq(customUrls.path, slug))
      .limit(1);
    return existingCustomUrl.length === 0;
  }

  /** Build WHERE conditions from filters (shared by list and count) */
  function buildFilterConditions(filters: PostFilters) {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(posts.status, filters.status));
    }
    if (filters.visibility !== undefined) {
      conditions.push(eq(posts.visibility, filters.visibility));
    }
    if (filters.excludeUnlisted) {
      conditions.push(sql`${posts.visibility} != 'unlisted'`);
    }
    if (filters.excludePrivate) {
      conditions.push(sql`${posts.visibility} != 'private'`);
    }
    if (filters.pinned !== undefined) {
      conditions.push(
        filters.pinned
          ? sql`${posts.pinnedAt} IS NOT NULL`
          : isNull(posts.pinnedAt),
      );
    }
    if (filters.format) {
      conditions.push(eq(posts.format, filters.format));
    }
    if (filters.collectionId !== undefined) {
      // Filter by collection via junction table
      conditions.push(
        sql`${posts.id} IN (SELECT post_id FROM post_collection WHERE collection_id = ${filters.collectionId})`,
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
    if (filters.publishedAfter !== undefined) {
      conditions.push(sql`${posts.publishedAt} >= ${filters.publishedAfter}`);
    }
    if (filters.publishedBefore !== undefined) {
      conditions.push(sql`${posts.publishedAt} < ${filters.publishedBefore}`);
    }
    if (filters.mediaKinds && filters.mediaKinds.length > 0) {
      const placeholders = filters.mediaKinds.map((k) => sql`${k}`);
      conditions.push(
        sql`${posts.id} IN (SELECT post_id FROM media WHERE media_kind IN (${sql.join(placeholders, sql`, `)}))`,
      );
    }
    if (filters.hasTitle !== undefined) {
      if (filters.hasTitle) {
        conditions.push(
          sql`${posts.title} IS NOT NULL AND ${posts.title} != ''`,
        );
      } else {
        conditions.push(sql`(${posts.title} IS NULL OR ${posts.title} = '')`);
      }
    }

    return conditions;
  }

  function toPost(row: typeof posts.$inferSelect): Post {
    return {
      id: row.id,
      format: row.format as Format,
      status: row.status as Status,
      visibility: row.visibility as Visibility,
      pinnedAt: row.pinnedAt,
      slug: row.slug,
      title: row.title,
      url: row.url,
      body: row.body,
      bodyHtml: row.bodyHtml,
      bodyText: row.bodyText,
      quoteText: row.quoteText,
      summary: row.summary,
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

    async getBySlug(slug) {
      const result = await db
        .select()
        .from(posts)
        .where(and(eq(posts.slug, slug), isNull(posts.deletedAt)))
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
        .orderBy(desc(posts.pinnedAt), desc(posts.publishedAt), desc(posts.id))
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

    async create(data, summaryConfig) {
      const id = uuidv7();
      const timestamp = now();

      const bodyHtml = data.body ? renderTiptapJson(data.body) : null;
      const bodyText = data.body ? extractBodyText(data.body) : null;

      // Generate summary for titled notes with body content
      let summary: string | null = null;
      if (data.format === "note" && data.title && data.body && summaryConfig) {
        summary = extractSummary(
          data.body,
          summaryConfig.maxParagraphs,
          summaryConfig.maxChars,
        );
      }

      // Handle thread relationship
      let threadId: string | null = null;
      let status: Status = data.status ?? "published";
      let visibility: Visibility = data.visibility ?? "public";

      if (data.replyToId) {
        const parent = await this.getById(data.replyToId);
        if (parent) {
          threadId = parent.threadId ?? parent.id;
          // Inherit status and visibility from root
          const root = parent.threadId
            ? await this.getById(parent.threadId)
            : parent;
          if (root) {
            if (data.status !== "draft") {
              status = root.status as Status;
            }
            visibility = root.visibility as Visibility;
          }
        }
      }

      // Generate slug
      const slug = await generatePostSlug({
        slug: data.slug,
        title: data.title,
        idLength: config.slugIdLength,
        isAvailable: isSlugAvailable,
      });

      let result;
      try {
        result = await db
          .insert(posts)
          .values({
            id,
            format: data.format,
            status,
            visibility,
            pinnedAt: data.pinned ? timestamp : null,
            slug,
            title: data.title ?? null,
            url: data.url ?? null,
            body: data.body ?? null,
            bodyHtml,
            bodyText,
            quoteText: data.quoteText ?? null,
            summary,
            rating: data.rating ?? null,
            replyToId: data.replyToId ?? null,
            threadId,
            publishedAt: data.publishedAt ?? timestamp,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .returning();
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          throw new ConflictError(`Slug "${slug}" is already in use`);
        }
        throw err;
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      const post = toPost(result[0]!);

      // Sync collection memberships if provided
      if (data.collectionIds && data.collectionIds.length > 0) {
        await db.insert(postCollections).values(
          data.collectionIds.map((collectionId) => ({
            postId: post.id,
            collectionId,
            createdAt: timestamp,
          })),
        );
      }

      return post;
    },

    async update(id, data, summaryConfig) {
      const existing = await this.getById(id);
      if (!existing) return null;

      const timestamp = now();
      const updates: Partial<typeof posts.$inferInsert> = {
        updatedAt: timestamp,
      };

      // Handle slug change
      if (data.slug !== undefined && data.slug !== existing.slug) {
        // Validate new slug availability
        const available = await isSlugAvailable(data.slug);
        if (!available) {
          throw new ConflictError(`Slug "${data.slug}" is already in use`);
        }
        updates.slug = data.slug;
      }

      if (data.format !== undefined) updates.format = data.format;
      if (data.title !== undefined) updates.title = data.title;
      if (data.url !== undefined) updates.url = data.url;
      if (data.quoteText !== undefined) updates.quoteText = data.quoteText;
      if (data.rating !== undefined) updates.rating = data.rating;
      if (data.publishedAt !== undefined)
        updates.publishedAt = data.publishedAt;
      if (data.pinned !== undefined)
        updates.pinnedAt = data.pinned ? now() : null;

      if (data.body !== undefined) {
        updates.body = data.body;
        updates.bodyHtml = data.body ? renderTiptapJson(data.body) : null;
        updates.bodyText = data.body ? extractBodyText(data.body) : null;
      }

      // Recompute summary when body, title, or format change
      if (summaryConfig) {
        const format = data.format ?? (existing.format as Format);
        const title = data.title !== undefined ? data.title : existing.title;
        const body = data.body !== undefined ? data.body : existing.body;
        if (format === "note" && title && body) {
          updates.summary = extractSummary(
            body,
            summaryConfig.maxParagraphs,
            summaryConfig.maxChars,
          );
        } else {
          updates.summary = null;
        }
      }

      // Thread replies inherit visibility from root — reject direct changes
      if (data.visibility !== undefined && existing.threadId) {
        throw new ConflictError(
          "Cannot change visibility of a thread reply. Update the root post instead.",
        );
      }

      // Handle status/visibility change - cascade to thread if this is root
      const statusChanged =
        data.status !== undefined && data.status !== existing.status;
      const visibilityChanged =
        data.visibility !== undefined &&
        data.visibility !== existing.visibility;

      if (statusChanged) updates.status = data.status;
      if (visibilityChanged) updates.visibility = data.visibility;

      // Build all write queries for atomic execution via D1 batch
      const needsCascade =
        (statusChanged || visibilityChanged) && !existing.threadId;
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
              visibility:
                data.visibility ?? (existing.visibility as Visibility),
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
                createdAt: now(),
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
        let postIds: string[];
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

    async updateThreadStatusAndVisibility(rootId, status, visibility) {
      const timestamp = now();
      await db
        .update(posts)
        .set({ status, visibility, updatedAt: timestamp })
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

      const counts = new Map<string, number>();
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

      const result = new Map<string, Post[]>();
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

    async getThreadTimelineContext(rootIds) {
      if (rootIds.length === 0) return new Map();

      // Fetch all non-deleted replies ordered by thread, newest first
      const rows = await db
        .select()
        .from(posts)
        .where(and(inArray(posts.threadId, rootIds), isNull(posts.deletedAt)))
        .orderBy(posts.threadId, desc(posts.createdAt), desc(posts.id));

      // Group by threadId, extract latest reply + its parent + count
      const grouped = new Map<string, Post[]>();
      for (const row of rows) {
        const post = toPost(row);
        if (post.threadId === null) continue;
        const list = grouped.get(post.threadId);
        if (list) {
          list.push(post);
        } else {
          grouped.set(post.threadId, [post]);
        }
      }

      const result = new Map<string, ThreadTimelineContext>();
      for (const [threadId, replies] of grouped) {
        // replies are ordered newest-first; first element is the latest
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- grouped only contains non-empty arrays
        const latestReply = replies[0]!;
        const totalReplyCount = replies.length;

        // Find parent of latestReply if it's not the root
        let parentReply: Post | null = null;
        if (latestReply.replyToId && latestReply.replyToId !== threadId) {
          parentReply =
            replies.find((r) => r.id === latestReply.replyToId) ?? null;
        }

        result.set(threadId, { latestReply, parentReply, totalReplyCount });
      }

      return result;
    },

    async getDistinctYears(filters = {}) {
      const conditions = buildFilterConditions(filters);

      const rows = await db
        .select({
          year: sql<string>`strftime('%Y', ${posts.publishedAt}, 'unixepoch')`.as(
            "year",
          ),
        })
        .from(posts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(sql`strftime('%Y', ${posts.publishedAt}, 'unixepoch')`)
        .orderBy(desc(sql`strftime('%Y', ${posts.publishedAt}, 'unixepoch')`));

      return rows.map((r) => parseInt(r.year, 10));
    },
  };
}
