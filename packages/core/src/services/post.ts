/**
 * Post Service (v2)
 *
 * CRUD operations for posts with Thread support.
 * Posts have format (note/link/quote), status (draft/published),
 * visibility (public/unlisted/private), featuredAt, and pinnedAt timestamp.
 */

import {
  eq,
  and,
  isNull,
  desc,
  inArray,
  sql,
  isNotNull,
  asc,
  lte,
} from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { uuidv7 } from "uuidv7";
import { type Database, batchQueryRows } from "../db/index.js";
import { pathRegistry, posts, postCollections } from "../db/schema.js";
import { now } from "../lib/time.js";
import { renderTiptapJson } from "../lib/tiptap-render.js";
import { extractSummary, extractBodyText } from "../lib/summary.js";
import { markdownToTiptapJson } from "../lib/markdown-to-tiptap.js";
import { generatePostSlug } from "../lib/slug.js";
import { getSlugValidationIssue } from "../lib/slug-format.js";
import { normalizePath, slugify } from "../lib/url.js";
import type { StorageDriver } from "../lib/storage.js";
import type { MediaService } from "./media.js";
import { MAX_MEDIA_ATTACHMENTS } from "../types.js";
import type {
  Format,
  Status,
  Visibility,
  SortOrder,
  MediaKind,
  Post,
  CreatePost,
  PostAttachmentInput,
  UpdatePost,
  ThreadTimelineContext,
} from "../types.js";
import {
  ConflictError,
  ValidationError,
  NotFoundError,
} from "../lib/errors.js";
import { createPathService, type PathService } from "./path.js";

/** Dependencies for operations that coordinate with other services */
export interface PostDeleteDeps {
  media: MediaService;
  storage?: StorageDriver | null;
}

export interface PostAttachmentDeps extends PostDeleteDeps {
  storageDriver: string;
  maxFileSizeMB: number;
}

export interface PostFilters {
  format?: Format;
  status?: Status;
  visibility?: Visibility;
  pinned?: boolean;
  featured?: boolean;
  collectionId?: string;
  /** Exclude posts that are replies (have replyToId set) */
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
  /** Filter by media presence */
  hasMedia?: boolean;
  /** Filter by title presence */
  hasTitle?: boolean;
  /** Filter by rating presence */
  hasRating?: boolean;
  /** Explicit result sort order */
  sortOrder?: SortOrder;
  limit?: number;
  cursor?: string; // post id for cursor pagination (UUIDv7 sorts chronologically)
  offset?: number; // offset for page-based pagination
}

/** Config for automatic summary extraction */
export interface SummaryConfig {
  maxParagraphs: number;
  maxChars: number;
}

interface ThreadRootPageOptions {
  status?: Status;
  excludePrivate?: boolean;
  limit?: number;
  offset?: number;
}

interface CollectionThreadRootPageOptions extends ThreadRootPageOptions {
  sortOrder?: SortOrder;
}

export interface PostService {
  getById(id: string): Promise<Post | null>;
  getBySlug(slug: string): Promise<Post | null>;
  suggestSlug(input: {
    title?: string;
    slug?: string;
    excludePostId?: string;
  }): Promise<string>;
  checkSlugAvailability(slug: string, excludePostId?: string): Promise<boolean>;
  list(filters?: PostFilters): Promise<Post[]>;
  /** Count posts matching filters (ignores cursor, offset, limit) */
  count(filters?: PostFilters): Promise<number>;
  /** Count posts grouped by published year-month (YYYY-MM) */
  countByYearMonth(
    filters?: PostFilters,
  ): Promise<{ yearMonth: string; count: number }[]>;
  create(data: CreatePost, summaryConfig?: SummaryConfig): Promise<Post>;
  createWithAttachments(
    data: CreatePost,
    attachments: PostAttachmentInput[] | undefined,
    deps: PostAttachmentDeps,
    summaryConfig?: SummaryConfig,
  ): Promise<Post>;
  update(
    id: string,
    data: UpdatePost,
    summaryConfig?: SummaryConfig,
  ): Promise<Post | null>;
  updateWithAttachments(
    id: string,
    data: UpdatePost,
    attachments: PostAttachmentInput[] | undefined,
    deps: PostAttachmentDeps,
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
  /** Count distinct thread roots that contain featured published posts */
  countFeaturedThreadRoots(options?: ThreadRootPageOptions): Promise<number>;
  /** List featured thread root IDs ordered by the latest featured post in each thread */
  listFeaturedThreadRootIds(options?: ThreadRootPageOptions): Promise<string[]>;
  /** Count distinct thread roots that contain published posts in the given collection */
  countCollectionThreadRoots(
    collectionId: string,
    options?: ThreadRootPageOptions,
  ): Promise<number>;
  /** List collection thread root IDs ordered by collected-at or rating semantics */
  listCollectionThreadRootIds(
    collectionId: string,
    options?: CollectionThreadRootPageOptions,
  ): Promise<string[]>;
  /** Fetch all published, non-deleted posts for each requested thread root */
  getPublishedThreads(rootIds: string[]): Promise<Map<string, Post[]>>;
  /** For each thread, return post IDs that belong to the given collection */
  getCollectionPostIdsByThread(
    collectionId: string,
    threadIds: string[],
  ): Promise<Map<string, string[]>>;
  /** Get distinct years that have published posts */
  getDistinctYears(filters?: PostFilters): Promise<number[]>;
  /** For each thread ID, return the ID of the last published, non-deleted post */
  getLastPostIdsByThread(threadIds: string[]): Promise<Map<string, string>>;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

function isValidSlug(value: string): boolean {
  return SLUG_RE.test(value);
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

function hasNonEmptyText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function assertPostFormatShape(data: {
  format: Format;
  url?: string | null;
  quoteText?: string | null;
}): void {
  const hasUrl = hasNonEmptyText(data.url);
  const hasQuoteText = hasNonEmptyText(data.quoteText);

  if (data.format === "note") {
    if (hasUrl) {
      throw new ValidationError("Notes can't include a URL.");
    }
    if (hasQuoteText) {
      throw new ValidationError("Notes can't include quoted text.");
    }
    return;
  }

  if (data.format === "link") {
    if (!hasUrl) {
      throw new ValidationError("Link posts need a URL.");
    }
    if (hasQuoteText) {
      throw new ValidationError("Link posts can't include quoted text.");
    }
    return;
  }

  if (!hasQuoteText) {
    throw new ValidationError("Quote posts need quoted text.");
  }
}

function isThreadReply(post: Pick<Post, "replyToId">): boolean {
  return post.replyToId !== null;
}

function assertDraftPublishedAt(
  status: Status,
  publishedAt: number | undefined,
): void {
  if (status === "draft" && publishedAt !== undefined) {
    throw new ValidationError("Drafts can't set a publish time.");
  }
}

export function createPostService(
  db: Database,
  config: { slugIdLength: number },
  paths: PathService = createPathService(db),
): PostService {
  const effectiveVisibilityExpr = sql<string>`coalesce(
    ${posts.visibility},
    (SELECT root.visibility FROM post AS root WHERE root.id = ${posts.threadId})
  )`;

  /** Check if a slug is available (not used by posts or custom_urls) */
  async function isSlugAvailable(slug: string): Promise<boolean> {
    return paths.isPathAvailable(slug);
  }

  async function isSlugAvailableForPost(
    slug: string,
    excludePostId?: string,
  ): Promise<boolean> {
    const resolved = await paths.resolve(slug);
    if (!resolved) return true;

    return Boolean(
      excludePostId &&
      resolved.kind === "slug" &&
      resolved.postId === excludePostId,
    );
  }

  async function pathExists(path: string): Promise<boolean> {
    const rows = await db
      .select({ id: pathRegistry.id })
      .from(pathRegistry)
      .where(eq(pathRegistry.path, normalizePath(path)))
      .limit(1);
    return rows.length > 0;
  }

  async function recalculateThreadLastActivity(rootId: string): Promise<void> {
    const rootRows = await db
      .select({
        latestPublishedAt: sql<number | null>`MAX(${posts.publishedAt})`.as(
          "latest_published_at",
        ),
      })
      .from(posts)
      .where(and(eq(posts.threadId, rootId), isNull(posts.deletedAt)));

    const latestPublishedAt = rootRows[0]?.latestPublishedAt ?? null;
    const root = await db
      .select({ updatedAt: posts.updatedAt })
      .from(posts)
      .where(eq(posts.id, rootId))
      .limit(1);

    const lastActivityAt = latestPublishedAt ?? root[0]?.updatedAt ?? now();

    await db.update(posts).set({ lastActivityAt }).where(eq(posts.id, rootId));
  }

  /** Build WHERE conditions from filters (shared by list and count) */
  function buildFilterConditions(filters: PostFilters) {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(posts.status, filters.status));
    }
    if (filters.visibility !== undefined) {
      conditions.push(sql`${effectiveVisibilityExpr} = ${filters.visibility}`);
    }
    if (filters.excludeUnlisted) {
      conditions.push(sql`${effectiveVisibilityExpr} != 'unlisted'`);
    }
    if (filters.excludePrivate) {
      conditions.push(sql`${effectiveVisibilityExpr} != 'private'`);
    }
    if (filters.pinned !== undefined) {
      conditions.push(
        filters.pinned
          ? sql`${posts.pinnedAt} IS NOT NULL`
          : isNull(posts.pinnedAt),
      );
    }
    if (filters.featured !== undefined) {
      conditions.push(
        filters.featured
          ? sql`${posts.featuredAt} IS NOT NULL`
          : isNull(posts.featuredAt),
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
      conditions.push(isNull(posts.replyToId));
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
    if (filters.hasMedia !== undefined) {
      if (filters.hasMedia) {
        conditions.push(sql`${posts.id} IN (SELECT post_id FROM media)`);
      } else {
        conditions.push(sql`${posts.id} NOT IN (SELECT post_id FROM media)`);
      }
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
    if (filters.hasRating !== undefined) {
      conditions.push(
        filters.hasRating ? isNotNull(posts.rating) : isNull(posts.rating),
      );
    }

    return conditions;
  }

  function toPost(
    row: typeof posts.$inferSelect,
    slug: string,
    visibility: Visibility,
  ): Post {
    return {
      id: row.id,
      format: row.format as Format,
      status: row.status as Status,
      visibility,
      pinnedAt: row.pinnedAt,
      featuredAt: row.featuredAt,
      slug,
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
      lastActivityAt: row.lastActivityAt ?? row.publishedAt ?? row.updatedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async function hydratePost(
    row: typeof posts.$inferSelect | undefined,
  ): Promise<Post | null> {
    if (!row) return null;
    const slug = await paths.getPostSlug(row.id);
    if (!slug) return null;
    const rootVisibilityMap = await getThreadVisibilityMap([row.threadId]);
    const visibility = rootVisibilityMap.get(row.threadId) ?? row.visibility;
    if (!visibility) return null;
    return toPost(row, slug, visibility as Visibility);
  }

  async function hydratePosts(
    rows: (typeof posts.$inferSelect)[],
  ): Promise<Post[]> {
    if (rows.length === 0) return [];
    const slugMap = await paths.getPostSlugMap(rows.map((row) => row.id));
    const rootVisibilityMap = await getThreadVisibilityMap(
      rows.map((row) => row.threadId),
    );
    return rows
      .map((row) => {
        const slug = slugMap.get(row.id);
        const visibility =
          rootVisibilityMap.get(row.threadId) ?? row.visibility;
        return slug && visibility
          ? toPost(row, slug, visibility as Visibility)
          : null;
      })
      .filter((row): row is Post => row !== null);
  }

  async function hydratePostsById(ids: string[]): Promise<Map<string, Post>> {
    const result = new Map<string, Post>();
    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
      return result;
    }

    const rows = await batchQueryRows(uniqueIds, (chunk) =>
      db
        .select()
        .from(posts)
        .where(
          and(
            inArray(posts.id, chunk),
            eq(posts.status, "published"),
            isNull(posts.deletedAt),
          ),
        ),
    );

    for (const post of await hydratePosts(rows)) {
      result.set(post.id, post);
    }

    return result;
  }

  async function getThreadVisibilityMap(
    threadIds: string[],
  ): Promise<Map<string, Visibility>> {
    const uniqueThreadIds = [...new Set(threadIds)];
    const result = new Map<string, Visibility>();
    if (uniqueThreadIds.length === 0) return result;

    const rows = await batchQueryRows(uniqueThreadIds, (chunk) =>
      db
        .select({ id: posts.id, visibility: posts.visibility })
        .from(posts)
        .where(inArray(posts.id, chunk)),
    );

    for (const row of rows) {
      if (row.visibility) {
        result.set(row.id, row.visibility as Visibility);
      }
    }

    return result;
  }

  function buildThreadRootPageConditions(options?: ThreadRootPageOptions) {
    const conditions = [isNull(posts.deletedAt)];
    const status = options?.status;

    if (status) {
      conditions.push(eq(posts.status, status));
    }
    if (options?.excludePrivate) {
      conditions.push(sql`${effectiveVisibilityExpr} != 'private'`);
    }

    return conditions;
  }

  function isMediaAttachmentInput(
    attachment: PostAttachmentInput,
  ): attachment is Extract<PostAttachmentInput, { type: "media" }> {
    return attachment.type === "media";
  }

  async function createAttachmentMediaIds(
    attachments: PostAttachmentInput[],
    deps: PostAttachmentDeps,
  ) {
    if (attachments.length > MAX_MEDIA_ATTACHMENTS) {
      throw new ValidationError(
        `Posts allow at most ${MAX_MEDIA_ATTACHMENTS} attachments`,
      );
    }

    const orderedMediaIds: string[] = [];
    const createdTextMediaIds: string[] = [];
    const referencedMediaIds = attachments
      .filter(isMediaAttachmentInput)
      .map((attachment) => attachment.mediaId);

    await deps.media.validateIds(referencedMediaIds);

    try {
      for (const attachment of attachments) {
        if (isMediaAttachmentInput(attachment)) {
          orderedMediaIds.push(attachment.mediaId);
          continue;
        }

        const created = await deps.media.createTextAttachment(attachment, {
          storage: deps.storage,
          storageDriver: deps.storageDriver,
          maxFileSizeMB: deps.maxFileSizeMB,
        });
        orderedMediaIds.push(created.id);
        createdTextMediaIds.push(created.id);
      }
    } catch (error) {
      await cleanupCreatedTextAttachments(createdTextMediaIds, deps);
      throw error;
    }

    return { orderedMediaIds, createdTextMediaIds };
  }

  async function applyAttachmentAltUpdates(
    attachments: PostAttachmentInput[],
    deps: PostAttachmentDeps,
  ) {
    const altUpdates = attachments
      .filter(isMediaAttachmentInput)
      .filter((attachment) => attachment.alt !== undefined)
      .map((attachment) =>
        deps.media.updateAlt(attachment.mediaId, attachment.alt ?? ""),
      );

    await Promise.all(altUpdates);
  }

  async function cleanupCreatedTextAttachments(
    mediaIds: string[],
    deps: PostAttachmentDeps,
  ) {
    if (mediaIds.length === 0) return;
    await deps.media.deleteByIds(mediaIds, deps.storage).catch(() => undefined);
  }

  async function getCollectionIdsForPost(postId: string): Promise<string[]> {
    const rows = await db
      .select({ collectionId: postCollections.collectionId })
      .from(postCollections)
      .where(eq(postCollections.postId, postId));

    return rows.map((row) => row.collectionId);
  }

  function buildRollbackUpdate(
    post: Post,
    collectionIds: string[],
  ): UpdatePost {
    return {
      format: post.format,
      title: post.title,
      body: post.body ?? null,
      slug: post.slug,
      status: post.status,
      visibility: post.visibility,
      pinned: post.pinnedAt !== null,
      featured: post.featuredAt !== null,
      url: post.url,
      quoteText: post.quoteText,
      rating: post.rating,
      collectionIds,
      publishedAt: post.publishedAt ?? undefined,
    };
  }

  return {
    async getById(id) {
      const result = await db
        .select()
        .from(posts)
        .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
        .limit(1);
      return hydratePost(result[0]);
    },

    async getBySlug(slug) {
      const resolved = await paths.resolve(slug);
      if (!resolved || resolved.kind !== "slug" || !resolved.postId) {
        return null;
      }
      return this.getById(resolved.postId);
    },

    async suggestSlug(input) {
      return generatePostSlug({
        slug: input.slug,
        title: input.title,
        idLength: config.slugIdLength,
        isAvailable: (candidate) =>
          isSlugAvailableForPost(candidate, input.excludePostId),
      });
    },

    async checkSlugAvailability(slug, excludePostId) {
      const issue = getSlugValidationIssue(slug);
      if (issue === "invalid") {
        throw new ValidationError("Slug contains invalid characters");
      }
      if (issue === "reserved") {
        throw new ValidationError("Slug is reserved");
      }

      return isSlugAvailableForPost(slug, excludePostId);
    },

    async list(filters = {}) {
      const conditions = buildFilterConditions(filters);
      const sortTimestamp =
        filters.status === "draft"
          ? posts.updatedAt
          : filters.status === "published"
            ? posts.lastActivityAt
            : sql<number>`CASE
                WHEN ${posts.status} = 'draft' THEN ${posts.updatedAt}
                ELSE ${posts.lastActivityAt}
              END`;

      if (filters.cursor) {
        conditions.push(sql`${posts.id} < ${filters.cursor}`);
      }

      const ratingPresence = sql<number>`CASE
          WHEN ${posts.rating} IS NULL THEN 0
          ELSE 1
        END`;

      const baseQuery = db
        .select()
        .from(posts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(filters.limit ?? 100);

      let query =
        filters.featured || filters.sortOrder === undefined
          ? baseQuery.orderBy(
              desc(posts.pinnedAt),
              filters.featured ? desc(posts.featuredAt) : desc(sortTimestamp),
              desc(posts.id),
            )
          : filters.sortOrder === "oldest"
            ? baseQuery.orderBy(
                desc(posts.pinnedAt),
                asc(sortTimestamp),
                asc(posts.id),
              )
            : filters.sortOrder === "rating_desc"
              ? baseQuery.orderBy(
                  desc(posts.pinnedAt),
                  desc(ratingPresence),
                  desc(posts.rating),
                  desc(sortTimestamp),
                  desc(posts.id),
                )
              : baseQuery.orderBy(
                  desc(posts.pinnedAt),
                  desc(ratingPresence),
                  asc(posts.rating),
                  desc(sortTimestamp),
                  desc(posts.id),
                );

      if (filters.offset !== undefined) {
        query = query.offset(filters.offset) as typeof query;
      }

      const rows = await query;
      return hydratePosts(rows);
    },

    async count(filters = {}) {
      const conditions = buildFilterConditions(filters);

      const result = await db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(posts)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return result[0]?.count ?? 0;
    },

    async countByYearMonth(filters = {}) {
      const conditions = [
        ...buildFilterConditions(filters),
        isNotNull(posts.publishedAt),
      ];

      return db
        .select({
          yearMonth:
            sql<string>`strftime('%Y-%m', ${posts.publishedAt}, 'unixepoch')`.as(
              "year_month",
            ),
          count: sql<number>`count(*)`.as("count"),
        })
        .from(posts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(sql`strftime('%Y-%m', ${posts.publishedAt}, 'unixepoch')`)
        .orderBy(
          desc(sql`strftime('%Y-%m', ${posts.publishedAt}, 'unixepoch')`),
        );
    },

    async create(data, summaryConfig) {
      const id = uuidv7();
      const timestamp = now();

      assertPostFormatShape({
        format: data.format,
        url: data.url,
        quoteText: data.quoteText,
      });

      const body = data.bodyMarkdown
        ? markdownToTiptapJson(data.bodyMarkdown)
        : (data.body ?? null);
      const bodyHtml = body ? renderTiptapJson(body) : null;
      const bodyText = body ? extractBodyText(body) : null;

      // Generate summary for titled notes with body content
      let summary: string | null = null;
      if (data.format === "note" && data.title && body && summaryConfig) {
        summary = extractSummary(
          body,
          summaryConfig.maxParagraphs,
          summaryConfig.maxChars,
        );
      }

      // Handle thread relationship
      let threadId = id;
      let status: Status = data.status ?? "published";
      let visibility: Visibility | null = data.visibility ?? "public";

      if (data.replyToId) {
        const parent = await this.getById(data.replyToId);
        if (!parent) {
          throw new NotFoundError("Parent post");
        }

        if (data.pinned) {
          throw new ConflictError(
            "Cannot pin a thread reply. Pin the root post instead.",
          );
        }

        threadId = parent.threadId;

        // Replies inherit visibility from the root at read time.
        const root =
          parent.threadId === parent.id
            ? parent
            : await this.getById(parent.threadId);
        if (root) {
          if (data.status !== "draft") {
            status = root.status as Status;
          }
        }
        visibility = null;
      }

      assertDraftPublishedAt(status, data.publishedAt);
      const publishedAt =
        status === "published" ? (data.publishedAt ?? timestamp) : null;

      // Resolve slug from slug, path, or title
      let slug: string;
      let aliasPath: string | null = null;

      if (data.path) {
        const normalized = normalizePath(data.path);
        if (isValidSlug(normalized)) {
          // Path is a valid slug — use it directly
          slug = await generatePostSlug({
            slug: normalized,
            idLength: config.slugIdLength,
            isAvailable: isSlugAvailable,
          });
        } else {
          // Path is not a valid slug — slugify it for the slug, keep original as alias
          const slugified = slugify(normalized);
          slug = await generatePostSlug({
            slug: slugified || undefined,
            title: data.title,
            idLength: config.slugIdLength,
            isAvailable: isSlugAvailable,
          });
          // Verify the alias path is available before proceeding
          if (!(await paths.isPathAvailable(normalized))) {
            throw new ConflictError(`Path "${normalized}" is already in use`);
          }
          aliasPath = normalized;
        }
      } else {
        slug = await generatePostSlug({
          slug: data.slug,
          title: data.title,
          idLength: config.slugIdLength,
          isAvailable: isSlugAvailable,
        });
      }

      const collectionIds = [...new Set(data.collectionIds ?? [])];

      try {
        const writeQueries: BatchItem<"sqlite">[] = [
          db.insert(posts).values({
            id,
            format: data.format,
            status,
            visibility,
            pinnedAt: data.pinned ? timestamp : null,
            featuredAt: data.featured ? timestamp : null,
            title: data.title ?? null,
            url: data.url ?? null,
            body: body ?? null,
            bodyHtml,
            bodyText,
            quoteText: data.quoteText ?? null,
            summary,
            rating: data.rating ?? null,
            replyToId: data.replyToId ?? null,
            threadId,
            publishedAt,
            lastActivityAt: publishedAt ?? timestamp,
            createdAt: timestamp,
            updatedAt: timestamp,
          }),
          db.insert(pathRegistry).values({
            id: uuidv7(),
            path: normalizePath(slug),
            kind: "slug",
            postId: id,
            collectionId: null,
            redirectToPath: null,
            redirectType: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          }),
        ];

        if (aliasPath) {
          writeQueries.push(
            db.insert(pathRegistry).values({
              id: uuidv7(),
              path: normalizePath(aliasPath),
              kind: "alias",
              postId: id,
              collectionId: null,
              redirectToPath: null,
              redirectType: null,
              createdAt: timestamp,
              updatedAt: timestamp,
            }),
          );
        }

        if (collectionIds.length > 0) {
          writeQueries.push(
            db.insert(postCollections).values(
              collectionIds.map((collectionId) => ({
                postId: id,
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
      } catch (err) {
        if (err instanceof ConflictError) {
          throw new ConflictError(`Slug "${slug}" is already in use`);
        }
        if (isUniqueConstraintError(err) && (await pathExists(slug))) {
          throw new ConflictError(`Slug "${slug}" is already in use`);
        }
        throw err;
      }

      const post = await this.getById(id);
      if (!post) {
        throw new ConflictError(`Slug "${slug}" could not be resolved`);
      }

      // Bump thread root's lastActivityAt when creating a published reply
      if (data.replyToId && status === "published") {
        await recalculateThreadLastActivity(threadId);
      }

      return post;
    },

    async createWithAttachments(data, attachments, deps, summaryConfig) {
      const attachmentInputs = attachments ?? [];
      const { orderedMediaIds, createdTextMediaIds } =
        await createAttachmentMediaIds(attachmentInputs, deps);

      try {
        const post = await this.create(data, summaryConfig);

        try {
          if (orderedMediaIds.length > 0) {
            await deps.media.attachToPost(post.id, orderedMediaIds);
          }
          await applyAttachmentAltUpdates(attachmentInputs, deps);
          return post;
        } catch (error) {
          await deps.media.attachToPost(post.id, []).catch(() => undefined);
          await this.delete(post.id, {
            media: deps.media,
            storage: deps.storage,
          }).catch(() => undefined);
          await cleanupCreatedTextAttachments(createdTextMediaIds, deps);
          throw error;
        }
      } catch (error) {
        await cleanupCreatedTextAttachments(createdTextMediaIds, deps);
        throw error;
      }
    },

    async update(id, data, summaryConfig) {
      const existing = await this.getById(id);
      if (!existing) return null;

      const timestamp = now();
      const nextFormat = data.format ?? existing.format;
      const nextUrl = data.url !== undefined ? data.url : existing.url;
      const nextQuoteText =
        data.quoteText !== undefined ? data.quoteText : existing.quoteText;
      const nextStatus = data.status ?? existing.status;

      assertPostFormatShape({
        format: nextFormat,
        url: nextUrl,
        quoteText: nextQuoteText,
      });
      assertDraftPublishedAt(nextStatus, data.publishedAt);

      const updates: Partial<typeof posts.$inferInsert> = {
        updatedAt: timestamp,
      };

      // Handle slug change
      const slugChanged =
        data.slug !== undefined && data.slug !== existing.slug;
      if (slugChanged && data.slug) {
        try {
          await paths.updatePostSlug(id, data.slug);
        } catch (err) {
          if (err instanceof ConflictError) {
            throw new ConflictError(`Slug "${data.slug}" is already in use`);
          }
          throw err;
        }
      }

      if (data.format !== undefined) updates.format = data.format;
      if (data.title !== undefined) updates.title = data.title;
      if (data.url !== undefined) updates.url = data.url;
      if (data.quoteText !== undefined) updates.quoteText = data.quoteText;
      if (data.rating !== undefined) updates.rating = data.rating;
      if (data.pinned !== undefined)
        updates.pinnedAt = data.pinned ? now() : null;
      if (data.featured !== undefined)
        updates.featuredAt = data.featured ? now() : null;

      if (data.body !== undefined || data.bodyMarkdown !== undefined) {
        const normalizedBody = data.bodyMarkdown
          ? markdownToTiptapJson(data.bodyMarkdown)
          : (data.body ?? null);
        updates.body = normalizedBody;
        updates.bodyHtml = normalizedBody
          ? renderTiptapJson(normalizedBody)
          : null;
        updates.bodyText = normalizedBody
          ? extractBodyText(normalizedBody)
          : null;
      }

      // Recompute summary when body, title, or format change
      if (summaryConfig) {
        const format = data.format ?? (existing.format as Format);
        const title = data.title !== undefined ? data.title : existing.title;
        const body =
          data.bodyMarkdown !== undefined
            ? data.bodyMarkdown
              ? markdownToTiptapJson(data.bodyMarkdown)
              : null
            : data.body !== undefined
              ? data.body
              : existing.body;
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

      // Thread replies inherit visibility/pinned from root — reject direct changes
      if (isThreadReply(existing)) {
        if (data.visibility !== undefined) {
          throw new ConflictError(
            "Cannot change visibility of a thread reply. Update the root post instead.",
          );
        }
        if (data.pinned !== undefined) {
          throw new ConflictError(
            "Cannot pin a thread reply. Pin the root post instead.",
          );
        }
      }

      // Handle status/visibility change - cascade to thread if this is root
      const statusChanged =
        data.status !== undefined && data.status !== existing.status;
      const visibilityChanged =
        data.visibility !== undefined &&
        data.visibility !== existing.visibility;
      const publishedAtChanged = data.publishedAt !== undefined;
      const nextPublishedAt =
        nextStatus === "draft"
          ? null
          : publishedAtChanged
            ? (data.publishedAt ?? timestamp)
            : existing.status === "draft"
              ? timestamp
              : (existing.publishedAt ?? timestamp);

      if (statusChanged) updates.status = data.status;
      if (visibilityChanged && !isThreadReply(existing)) {
        updates.visibility = data.visibility;
      }
      if (statusChanged || publishedAtChanged || existing.status === "draft") {
        updates.publishedAt = nextPublishedAt;
        updates.lastActivityAt = nextPublishedAt ?? timestamp;
      }

      // Build all write queries for atomic execution via D1 batch
      const needsCascade = statusChanged && !isThreadReply(existing);
      const needsReplyVisibilityCleanup =
        !isThreadReply(existing) && (statusChanged || visibilityChanged);
      const needsCollectionSync = data.collectionIds !== undefined;
      const nextCollectionIds = needsCollectionSync
        ? [...new Set(data.collectionIds ?? [])]
        : [];
      const needsThreadActivityRecalc =
        statusChanged || publishedAtChanged || existing.status === "draft";
      const hasExtraWrites =
        needsCascade || needsReplyVisibilityCleanup || needsCollectionSync;

      if (!hasExtraWrites) {
        // Simple case: only the post update
        const result = await db
          .update(posts)
          .set(updates)
          .where(eq(posts.id, id))
          .returning();
        if (needsThreadActivityRecalc) {
          await recalculateThreadLastActivity(existing.threadId);
          return this.getById(id);
        }
        return hydratePost(result[0]);
      }

      // Complex case: batch cascade + update + collection sync atomically
      const writeQueries: BatchItem<"sqlite">[] = [];
      const existingCollectionIds = needsCollectionSync
        ? await getCollectionIdsForPost(id)
        : [];

      if (needsCascade) {
        writeQueries.push(
          db
            .update(posts)
            .set({
              status: data.status ?? (existing.status as Status),
              publishedAt: nextStatus === "published" ? nextPublishedAt : null,
              lastActivityAt:
                nextStatus === "published"
                  ? (nextPublishedAt ?? timestamp)
                  : timestamp,
              updatedAt: timestamp,
            })
            .where(and(eq(posts.threadId, id), isNotNull(posts.replyToId))),
        );
      }

      if (needsReplyVisibilityCleanup) {
        writeQueries.push(
          db
            .update(posts)
            .set({ visibility: null, updatedAt: timestamp })
            .where(and(eq(posts.threadId, id), isNotNull(posts.replyToId))),
        );
      }

      // Post update is always present; track its index for result extraction
      const updateIdx = writeQueries.length;
      writeQueries.push(
        db.update(posts).set(updates).where(eq(posts.id, id)).returning(),
      );

      if (needsCollectionSync) {
        const existingIds = new Set(existingCollectionIds);
        const nextIds = new Set(nextCollectionIds);
        const removedIds = existingCollectionIds.filter(
          (cid) => !nextIds.has(cid),
        );
        const addedIds = nextCollectionIds.filter(
          (cid) => !existingIds.has(cid),
        );

        if (removedIds.length > 0) {
          writeQueries.push(
            db
              .delete(postCollections)
              .where(
                and(
                  eq(postCollections.postId, id),
                  inArray(postCollections.collectionId, removedIds),
                ),
              ),
          );
        }

        if (addedIds.length > 0) {
          const collectionTimestamp = now();
          writeQueries.push(
            db.insert(postCollections).values(
              addedIds.map((collectionId) => ({
                postId: id,
                collectionId,
                createdAt: collectionTimestamp,
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
      if (needsThreadActivityRecalc) {
        await recalculateThreadLastActivity(existing.threadId);
        return this.getById(id);
      }
      return hydratePost(updateResult?.[0]);
    },

    async updateWithAttachments(id, data, attachments, deps, summaryConfig) {
      if (attachments === undefined) {
        return this.update(id, data, summaryConfig);
      }

      const existingPost = await this.getById(id);
      if (!existingPost) return null;

      const existingCollectionIds = await getCollectionIdsForPost(id);
      const rollbackData = buildRollbackUpdate(
        existingPost,
        existingCollectionIds,
      );
      const existingAttachments = await deps.media.getByPostId(id);
      const previousMediaIds = existingAttachments.map(
        (attachment) => attachment.id,
      );
      const previousAltMap = new Map(
        existingAttachments.map((attachment) => [
          attachment.id,
          attachment.alt ?? "",
        ]),
      );
      const { orderedMediaIds, createdTextMediaIds } =
        await createAttachmentMediaIds(attachments, deps);
      const post = await this.update(id, data, summaryConfig);

      if (!post) {
        await cleanupCreatedTextAttachments(createdTextMediaIds, deps);
        return null;
      }

      let replacedAttachments = false;

      try {
        await deps.media.attachToPost(post.id, orderedMediaIds);
        replacedAttachments = true;
        await applyAttachmentAltUpdates(attachments, deps);

        const nextAttachmentIds = new Set(orderedMediaIds);
        const removedTextAttachmentIds = existingAttachments
          .filter(
            (attachment) =>
              attachment.mimeType === "text/x-tiptap+json" &&
              !nextAttachmentIds.has(attachment.id),
          )
          .map((attachment) => attachment.id);
        await deps.media
          .deleteByIds(removedTextAttachmentIds, deps.storage)
          .catch(() => undefined);

        return post;
      } catch (error) {
        if (replacedAttachments) {
          await deps.media
            .attachToPost(post.id, previousMediaIds)
            .catch(() => undefined);
          await Promise.all(
            existingAttachments.map((attachment) =>
              deps.media.updateAlt(
                attachment.id,
                previousAltMap.get(attachment.id) ?? "",
              ),
            ),
          ).catch(() => undefined);
        }
        await this.update(id, rollbackData, summaryConfig).catch(
          () => undefined,
        );
        await cleanupCreatedTextAttachments(createdTextMediaIds, deps);
        throw error;
      }
    },

    async delete(id, deps) {
      const existing = await this.getById(id);
      if (!existing) return false;

      // Clean up media for all affected posts
      if (deps?.media) {
        let postIds: string[];
        if (!isThreadReply(existing)) {
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
      if (!isThreadReply(existing)) {
        await db
          .update(posts)
          .set({ deletedAt: timestamp, updatedAt: timestamp })
          .where(eq(posts.threadId, id));
      } else {
        // Soft-delete the single reply
        await db
          .update(posts)
          .set({ deletedAt: timestamp, updatedAt: timestamp })
          .where(eq(posts.id, id));
        await recalculateThreadLastActivity(existing.threadId);
      }

      return true;
    },

    async getThread(rootId) {
      const rows = await db
        .select()
        .from(posts)
        .where(and(eq(posts.threadId, rootId), isNull(posts.deletedAt)))
        .orderBy(posts.createdAt);

      return hydratePosts(rows);
    },

    async updateThreadStatusAndVisibility(rootId, status, visibility) {
      const timestamp = now();
      await db.batch([
        db
          .update(posts)
          .set({
            status,
            visibility,
            publishedAt: status === "published" ? timestamp : null,
            lastActivityAt: timestamp,
            updatedAt: timestamp,
          })
          .where(eq(posts.id, rootId)),
        db
          .update(posts)
          .set({
            status,
            visibility: null,
            publishedAt: status === "published" ? timestamp : null,
            lastActivityAt: timestamp,
            updatedAt: timestamp,
          })
          .where(and(eq(posts.threadId, rootId), isNotNull(posts.replyToId))),
      ]);
      await recalculateThreadLastActivity(rootId);
    },

    async getReplyCounts(postIds) {
      if (postIds.length === 0) return new Map();

      const rows = await db
        .select({
          threadId: posts.threadId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(posts)
        .where(
          and(
            inArray(posts.threadId, postIds),
            eq(posts.status, "published"),
            isNotNull(posts.replyToId),
            isNull(posts.deletedAt),
          ),
        )
        .groupBy(posts.threadId);

      const counts = new Map<string, number>();
      for (const row of rows) {
        counts.set(row.threadId, row.count);
      }
      return counts;
    },

    async getThreadPreviews(rootIds, previewCount = 3) {
      if (rootIds.length === 0) return new Map();

      const rankedReplies = db
        .select({
          id: posts.id,
          threadId: posts.threadId,
          createdAt: posts.createdAt,
          previewRank: sql<number>`ROW_NUMBER() OVER (
            PARTITION BY ${posts.threadId}
            ORDER BY ${posts.createdAt}, ${posts.id}
          )`.as("preview_rank"),
        })
        .from(posts)
        .where(
          and(
            inArray(posts.threadId, rootIds),
            eq(posts.status, "published"),
            isNotNull(posts.replyToId),
            isNull(posts.deletedAt),
          ),
        )
        .as("ranked_replies");

      const rankedRows = await db
        .select({
          id: rankedReplies.id,
          threadId: rankedReplies.threadId,
          createdAt: rankedReplies.createdAt,
        })
        .from(rankedReplies)
        .where(lte(rankedReplies.previewRank, previewCount))
        .orderBy(
          rankedReplies.threadId,
          rankedReplies.createdAt,
          rankedReplies.id,
        );

      const hydratedPosts = await hydratePostsById(
        rankedRows.map((row) => row.id),
      );
      const result = new Map<string, Post[]>();
      for (const row of rankedRows) {
        const post = hydratedPosts.get(row.id);
        if (!post) continue;

        const list = result.get(row.threadId);
        if (list) {
          list.push(post);
          continue;
        }

        result.set(row.threadId, [post]);
      }
      return result;
    },

    async getThreadTimelineContext(rootIds) {
      if (rootIds.length === 0) return new Map();

      const rankedReplies = db
        .select({
          id: posts.id,
          threadId: posts.threadId,
          replyToId: posts.replyToId,
          replyRank: sql<number>`ROW_NUMBER() OVER (
            PARTITION BY ${posts.threadId}
            ORDER BY ${posts.createdAt} DESC, ${posts.id} DESC
          )`.as("reply_rank"),
          totalReplyCount: sql<number>`COUNT(*) OVER (
            PARTITION BY ${posts.threadId}
          )`.as("total_reply_count"),
        })
        .from(posts)
        .where(
          and(
            inArray(posts.threadId, rootIds),
            eq(posts.status, "published"),
            isNotNull(posts.replyToId),
            isNull(posts.deletedAt),
          ),
        )
        .as("ranked_replies");

      const latestReplyRows = await db
        .select({
          threadId: rankedReplies.threadId,
          latestReplyId: rankedReplies.id,
          latestReplyToId: rankedReplies.replyToId,
          totalReplyCount: rankedReplies.totalReplyCount,
        })
        .from(rankedReplies)
        .where(eq(rankedReplies.replyRank, 1));

      const relatedPostIds = latestReplyRows.flatMap((row) => {
        const ids = [row.latestReplyId];

        if (row.latestReplyToId && row.latestReplyToId !== row.threadId) {
          ids.push(row.latestReplyToId);
        }

        return ids;
      });
      const hydratedPosts = await hydratePostsById(relatedPostIds);

      const result = new Map<string, ThreadTimelineContext>();
      for (const row of latestReplyRows) {
        const latestReply = hydratedPosts.get(row.latestReplyId);
        if (!latestReply) continue;

        const parentReply =
          row.latestReplyToId && row.latestReplyToId !== row.threadId
            ? (hydratedPosts.get(row.latestReplyToId) ?? null)
            : null;

        result.set(row.threadId, {
          latestReply,
          parentReply,
          totalReplyCount: row.totalReplyCount,
        });
      }

      return result;
    },

    async countFeaturedThreadRoots(options = {}) {
      const conditions = [
        ...buildThreadRootPageConditions(options),
        isNotNull(posts.featuredAt),
      ];

      const rows = await db
        .select({
          count: sql<number>`count(distinct ${posts.threadId})`.as("count"),
        })
        .from(posts)
        .where(and(...conditions));

      return rows[0]?.count ?? 0;
    },

    async listFeaturedThreadRootIds(options = {}) {
      const conditions = [
        ...buildThreadRootPageConditions(options),
        isNotNull(posts.featuredAt),
      ];
      const latestFeaturedAt = sql<number>`MAX(${posts.featuredAt})`.as(
        "latest_featured_at",
      );

      let query = db
        .select({
          threadId: posts.threadId,
          latestFeaturedAt,
        })
        .from(posts)
        .where(and(...conditions))
        .groupBy(posts.threadId)
        .orderBy(desc(latestFeaturedAt), desc(posts.threadId));

      if (options.limit !== undefined) {
        query = query.limit(options.limit) as typeof query;
      }
      if (options.offset !== undefined) {
        query = query.offset(options.offset) as typeof query;
      }

      const rows = await query;
      return rows.map((row) => row.threadId);
    },

    async countCollectionThreadRoots(collectionId, options = {}) {
      const conditions = [
        ...buildThreadRootPageConditions(options),
        eq(postCollections.collectionId, collectionId),
      ];

      const rows = await db
        .select({
          count: sql<number>`count(distinct ${posts.threadId})`.as("count"),
        })
        .from(posts)
        .innerJoin(postCollections, eq(postCollections.postId, posts.id))
        .where(and(...conditions));

      return rows[0]?.count ?? 0;
    },

    async listCollectionThreadRootIds(collectionId, options = {}) {
      const conditions = [
        ...buildThreadRootPageConditions(options),
        eq(postCollections.collectionId, collectionId),
      ];
      const sortOrder = options.sortOrder ?? "newest";
      const collectedAt =
        sortOrder === "oldest"
          ? sql<number>`MIN(${postCollections.createdAt})`.as("collected_at")
          : sql<number>`MAX(${postCollections.createdAt})`.as("collected_at");
      const ratingPresence = sql<number>`MAX(
        CASE
          WHEN ${posts.rating} IS NULL THEN 0
          ELSE 1
        END
      )`.as("rating_presence");
      const ratingValue =
        sortOrder === "rating_asc"
          ? sql<number | null>`MIN(${posts.rating})`.as("rating_value")
          : sql<number | null>`MAX(${posts.rating})`.as("rating_value");

      const baseQuery = db
        .select({
          threadId: posts.threadId,
          collectedAt,
          ratingPresence,
          ratingValue,
        })
        .from(posts)
        .innerJoin(postCollections, eq(postCollections.postId, posts.id))
        .where(and(...conditions))
        .groupBy(posts.threadId);

      let query =
        sortOrder === "oldest"
          ? baseQuery.orderBy(asc(collectedAt), asc(posts.threadId))
          : sortOrder === "rating_desc"
            ? baseQuery.orderBy(
                desc(ratingPresence),
                desc(ratingValue),
                desc(collectedAt),
                desc(posts.threadId),
              )
            : sortOrder === "rating_asc"
              ? baseQuery.orderBy(
                  desc(ratingPresence),
                  asc(ratingValue),
                  desc(collectedAt),
                  desc(posts.threadId),
                )
              : baseQuery.orderBy(desc(collectedAt), desc(posts.threadId));

      if (options.limit !== undefined) {
        query = query.limit(options.limit) as typeof query;
      }
      if (options.offset !== undefined) {
        query = query.offset(options.offset) as typeof query;
      }

      const rows = await query;
      return rows.map((row) => row.threadId);
    },

    async getPublishedThreads(rootIds) {
      const result = new Map<string, Post[]>();
      if (rootIds.length === 0) return result;

      const unique = [...new Set(rootIds)];
      const rows = await db
        .select()
        .from(posts)
        .where(
          and(
            inArray(posts.threadId, unique),
            eq(posts.status, "published"),
            isNull(posts.deletedAt),
          ),
        )
        .orderBy(posts.threadId, posts.createdAt, posts.id);

      for (const post of await hydratePosts(rows)) {
        const thread = result.get(post.threadId);
        if (thread) {
          thread.push(post);
        } else {
          result.set(post.threadId, [post]);
        }
      }

      return result;
    },

    async getCollectionPostIdsByThread(collectionId, threadIds) {
      const result = new Map<string, string[]>();
      if (threadIds.length === 0) return result;

      const unique = [...new Set(threadIds)];
      const rows = await batchQueryRows(unique, (chunk) =>
        db
          .select({
            threadId: posts.threadId,
            postId: posts.id,
          })
          .from(posts)
          .innerJoin(postCollections, eq(postCollections.postId, posts.id))
          .where(
            and(
              eq(postCollections.collectionId, collectionId),
              inArray(posts.threadId, chunk),
              eq(posts.status, "published"),
              isNull(posts.deletedAt),
            ),
          )
          .orderBy(posts.threadId, posts.createdAt, posts.id),
      );

      for (const row of rows) {
        const list = result.get(row.threadId);
        if (list) {
          list.push(row.postId);
        } else {
          result.set(row.threadId, [row.postId]);
        }
      }

      return result;
    },

    async getLastPostIdsByThread(threadIds) {
      const result = new Map<string, string>();
      if (threadIds.length === 0) return result;

      const unique = [...new Set(threadIds)];
      const rows = await db
        .select({
          threadId: posts.threadId,
          id: posts.id,
        })
        .from(posts)
        .where(
          and(
            inArray(posts.threadId, unique),
            eq(posts.status, "published"),
            isNull(posts.deletedAt),
          ),
        )
        .orderBy(posts.threadId, desc(posts.createdAt), desc(posts.id));

      for (const row of rows) {
        if (!result.has(row.threadId)) {
          result.set(row.threadId, row.id);
        }
      }
      return result;
    },

    async getDistinctYears(filters = {}) {
      const conditions = [
        ...buildFilterConditions(filters),
        isNotNull(posts.publishedAt),
      ];

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
