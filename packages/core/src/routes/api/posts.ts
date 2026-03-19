/**
 * Posts API Routes
 */

import { Hono } from "hono";
import type { Bindings, Media, Post } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { z } from "zod";
import {
  CreatePostApiSchema,
  UpdatePostApiSchema,
  FormatSchema,
  StatusSchema,
  parseValidated,
} from "../../lib/schemas.js";
import { requireAuthApi } from "../../middleware/auth.js";
import {
  getMediaUrl,
  getImageUrl,
  getPublicUrlForProvider,
} from "../../lib/image.js";
import { assertFound, NotFoundError, parseIdParam } from "../../lib/errors.js";
import { toPublicPath } from "../../lib/url.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const postsApiRoutes = new Hono<Env>();
const ATTACHED_TEXT_MIME_TYPE = "text/x-tiptap+json";

/**
 * Converts a Media record to an ordered attachment API response shape.
 */
function toApiAttachment(
  m: Media,
  r2PublicUrl?: string,
  imageTransformUrl?: string,
  s3PublicUrl?: string,
  localPublicUrl?: string,
  sitePathPrefix?: string,
) {
  const publicUrl = getPublicUrlForProvider(
    m.provider,
    r2PublicUrl,
    s3PublicUrl,
    localPublicUrl,
  );
  const url = getMediaUrl(m.storageKey, publicUrl, sitePathPrefix);

  if (m.mimeType === ATTACHED_TEXT_MIME_TYPE) {
    return {
      type: "text" as const,
      id: m.id,
      contentFormat: "markdown" as const,
      contentUrl: toPublicPath(
        `/api/attachments/${m.id}/content`,
        sitePathPrefix,
      ),
      summary: m.summary,
      chars: m.chars,
    };
  }

  const previewUrl = getImageUrl(url, imageTransformUrl, {
    width: 1200,
    height: 768,
    quality: 80,
    format: "auto",
    fit: "scale-down",
  });
  const posterUrl = m.posterKey
    ? getMediaUrl(m.posterKey, publicUrl, sitePathPrefix)
    : null;

  return {
    type: "media" as const,
    id: m.id,
    url,
    previewUrl,
    posterUrl,
    alt: m.alt,
    blurhash: m.blurhash,
    width: m.width,
    height: m.height,
    mimeType: m.mimeType,
    originalName: m.originalName,
    size: m.size,
    summary: m.summary,
    chars: m.chars,
  };
}

type ApiPostResponse = Omit<Post, "title" | "url"> & {
  attachments?: ReturnType<typeof toApiAttachment>[];
  collectionIds?: string[];
  title?: string | null;
  url?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

function toApiPost(
  post: Post,
  extras: {
    attachments?: ReturnType<typeof toApiAttachment>[];
    collectionIds?: string[];
  } = {},
): ApiPostResponse {
  const { title, url, ...rest } = post;

  if (post.format === "quote") {
    return {
      ...rest,
      ...extras,
      sourceName: title ?? null,
      sourceUrl: url ?? null,
    };
  }

  return {
    ...rest,
    ...extras,
    title: title ?? null,
    url: url ?? null,
  };
}

const ListPostsQuerySchema = z.object({
  format: FormatSchema.optional(),
  status: StatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(100),
});

const PostSlugQuerySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("suggest"),
    title: z.string().trim().max(300).optional(),
    postId: z.string().uuid().optional(),
  }),
  z.object({
    mode: z.literal("check"),
    slug: z.string().trim().toLowerCase().min(1).max(200),
    postId: z.string().uuid().optional(),
  }),
]);

// List posts (requires auth)
postsApiRoutes.get("/", requireAuthApi(), async (c) => {
  const { format, status, cursor, limit } = parseValidated(
    ListPostsQuerySchema,
    c.req.query(),
  );

  const posts = await c.var.services.posts.list({
    format,
    status: status ?? "published",
    cursor: cursor ?? undefined,
    limit,
  });

  // Batch load media for all posts
  const postIds = posts.map((p) => p.id);
  const mediaMap = await c.var.services.media.getByPostIds(postIds);
  const {
    r2PublicUrl,
    imageTransformUrl,
    s3PublicUrl,
    localPublicUrl,
    sitePathPrefix,
  } = c.var.appConfig;

  return c.json({
    posts: posts.map((p) =>
      toApiPost(p, {
        attachments: (mediaMap.get(p.id) ?? []).map((m) =>
          toApiAttachment(
            m,
            r2PublicUrl,
            imageTransformUrl,
            s3PublicUrl,
            localPublicUrl,
            sitePathPrefix,
          ),
        ),
      }),
    ),

    nextCursor:
      posts.length === limit ? (posts[posts.length - 1]?.id ?? null) : null,
  });
});

// Suggest or validate a post slug (requires auth)
postsApiRoutes.get("/slug", requireAuthApi(), async (c) => {
  const query = parseValidated(PostSlugQuerySchema, c.req.query());

  if (query.mode === "suggest") {
    const slug = await c.var.services.posts.suggestSlug({
      title: query.title,
      excludePostId: query.postId,
    });
    return c.json({ slug });
  }

  const available = await c.var.services.posts.checkSlugAvailability(
    query.slug,
    query.postId,
  );
  return c.json({
    slug: query.slug,
    available,
  });
});

// Get single post (requires auth)
postsApiRoutes.get("/:id", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"));

  // Fetch post, media, and collections in parallel (all keyed by the same id)
  const [post, mediaList, postCollections] = await Promise.all([
    c.var.services.posts.getById(id),
    c.var.services.media.getByPostId(id),
    c.var.services.collections.getCollectionsByPostId(id),
  ]);
  assertFound(post, "Post");
  const {
    r2PublicUrl,
    imageTransformUrl,
    s3PublicUrl,
    localPublicUrl,
    sitePathPrefix,
  } = c.var.appConfig;
  const collectionIds = postCollections.map((col) => col.id);

  return c.json(
    toApiPost(post, {
      collectionIds,
      attachments: mediaList.map((m) =>
        toApiAttachment(
          m,
          r2PublicUrl,
          imageTransformUrl,
          s3PublicUrl,
          localPublicUrl,
          sitePathPrefix,
        ),
      ),
    }),
  );
});

// Create post (requires auth)
postsApiRoutes.post("/", requireAuthApi(), async (c) => {
  const body = parseValidated(CreatePostApiSchema, await c.req.json());

  const post = await c.var.services.posts.createWithAttachments(
    {
      format: body.format,
      title: body.format === "quote" ? body.sourceName : body.title,
      body: body.body,
      bodyMarkdown: body.bodyMarkdown,
      slug: body.slug || undefined,
      path: body.path || undefined,
      status: body.status,
      visibility: body.visibility,
      pinned: body.pinned,
      featured: body.featured,
      url:
        body.format === "quote"
          ? body.sourceUrl || undefined
          : body.url || undefined,
      quoteText: body.quoteText,
      rating: body.rating || undefined,
      collectionIds: body.collectionIds,
      replyToId: body.replyToId,
      publishedAt: body.publishedAt,
    },
    body.attachments,
    {
      media: c.var.services.media,
      storage: c.var.storage,
      storageDriver: c.var.appConfig.storageDriver,
      maxFileSizeMB: c.var.appConfig.uploadMaxFileSize,
    },
    {
      maxParagraphs: c.var.appConfig.summaryMaxParagraphs,
      maxChars: c.var.appConfig.summaryMaxChars,
    },
  );

  const mediaList = await c.var.services.media.getByPostId(post.id);
  const {
    r2PublicUrl,
    imageTransformUrl,
    s3PublicUrl,
    localPublicUrl,
    sitePathPrefix,
  } = c.var.appConfig;

  return c.json(
    toApiPost(post, {
      attachments: mediaList.map((m) =>
        toApiAttachment(
          m,
          r2PublicUrl,
          imageTransformUrl,
          s3PublicUrl,
          localPublicUrl,
          sitePathPrefix,
        ),
      ),
    }),
    201,
  );
});

// Update post (requires auth)
postsApiRoutes.put("/:id", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"));

  const body = parseValidated(UpdatePostApiSchema, await c.req.json());

  const post = assertFound(
    await c.var.services.posts.updateWithAttachments(
      id,
      {
        format: body.format,
        title: body.sourceName ?? body.title,
        body: body.body,
        bodyMarkdown: body.bodyMarkdown,
        slug: body.slug,
        status: body.status,
        visibility: body.visibility,
        pinned: body.pinned,
        featured: body.featured,
        url: body.sourceUrl ?? body.url,
        quoteText: body.quoteText,
        rating: body.rating || undefined,
        collectionIds: body.collectionIds,
        publishedAt: body.publishedAt,
      },
      body.attachments,
      {
        media: c.var.services.media,
        storage: c.var.storage,
        storageDriver: c.var.appConfig.storageDriver,
        maxFileSizeMB: c.var.appConfig.uploadMaxFileSize,
      },
      {
        maxParagraphs: c.var.appConfig.summaryMaxParagraphs,
        maxChars: c.var.appConfig.summaryMaxChars,
      },
    ),
    "Post",
  );

  const mediaList = await c.var.services.media.getByPostId(post.id);
  const {
    r2PublicUrl,
    imageTransformUrl,
    s3PublicUrl,
    localPublicUrl,
    sitePathPrefix,
  } = c.var.appConfig;

  return c.json(
    toApiPost(post, {
      attachments: mediaList.map((m) =>
        toApiAttachment(
          m,
          r2PublicUrl,
          imageTransformUrl,
          s3PublicUrl,
          localPublicUrl,
          sitePathPrefix,
        ),
      ),
    }),
  );
});

// Delete post (requires auth)
postsApiRoutes.delete("/:id", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"));

  const success = await c.var.services.posts.delete(id, {
    media: c.var.services.media,
    storage: c.var.storage,
  });
  if (!success) throw new NotFoundError("Post");

  return c.json({ success: true });
});
