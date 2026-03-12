/**
 * Posts API Routes
 */

import { Hono } from "hono";
import type { Bindings, Media } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { z } from "zod";
import {
  CreatePostSchema,
  UpdatePostSchema,
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

type Env = { Bindings: Bindings; Variables: AppVariables };

export const postsApiRoutes = new Hono<Env>();

/**
 * Converts a Media record to a MediaAttachment API response shape.
 */
function toMediaAttachment(
  m: Media,
  r2PublicUrl?: string,
  imageTransformUrl?: string,
  s3PublicUrl?: string,
) {
  const publicUrl = getPublicUrlForProvider(
    m.provider,
    r2PublicUrl,
    s3PublicUrl,
  );
  const url = getMediaUrl(m.storageKey, publicUrl);
  const previewUrl = getImageUrl(url, imageTransformUrl, {
    width: 1200,
    height: 768,
    quality: 80,
    format: "auto",
    fit: "scale-down",
  });
  const posterUrl = m.posterKey ? getMediaUrl(m.posterKey, publicUrl) : null;

  return {
    id: m.id,
    url,
    previewUrl,
    posterUrl,
    alt: m.alt,
    blurhash: m.blurhash,
    width: m.width,
    height: m.height,
    position: m.position,
    mimeType: m.mimeType,
    summary: m.summary,
  };
}

const ListPostsQuerySchema = z.object({
  format: FormatSchema.optional(),
  status: StatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(100),
});

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
  const { r2PublicUrl, imageTransformUrl, s3PublicUrl } = c.var.appConfig;

  return c.json({
    posts: posts.map((p) => ({
      ...p,
      mediaAttachments: (mediaMap.get(p.id) ?? []).map((m) =>
        toMediaAttachment(m, r2PublicUrl, imageTransformUrl, s3PublicUrl),
      ),
    })),

    nextCursor:
      posts.length === limit ? (posts[posts.length - 1]?.id ?? null) : null,
  });
});

// Get single post (requires auth)
postsApiRoutes.get("/:id", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"));

  const post = assertFound(await c.var.services.posts.getById(id), "Post");

  const mediaList = await c.var.services.media.getByPostId(post.id);
  const { r2PublicUrl, imageTransformUrl, s3PublicUrl } = c.var.appConfig;

  // Get collection IDs for this post
  const postCollections =
    await c.var.services.collections.getCollectionsByPostId(post.id);
  const collectionIds = postCollections.map((col) => col.id);

  return c.json({
    ...post,
    collectionIds,
    mediaAttachments: mediaList.map((m) =>
      toMediaAttachment(m, r2PublicUrl, imageTransformUrl, s3PublicUrl),
    ),
  });
});

// Create post (requires auth)
postsApiRoutes.post("/", requireAuthApi(), async (c) => {
  const body = parseValidated(CreatePostSchema, await c.req.json());

  // Validate media IDs
  if (body.mediaIds) {
    await c.var.services.media.validateIds(body.mediaIds);
  }

  const post = await c.var.services.posts.create(
    {
      format: body.format,
      title: body.title,
      body: body.body,
      bodyMarkdown: body.bodyMarkdown,
      slug: body.slug || undefined,
      path: body.path || undefined,
      status: body.status,
      visibility: body.visibility,
      pinned: body.pinned,
      featured: body.featured,
      url: body.url || undefined,
      quoteText: body.quoteText,
      rating: body.rating || undefined,
      collectionIds: body.collectionIds,
      replyToId: body.replyToId,
      publishedAt: body.publishedAt,
    },
    {
      maxParagraphs: c.var.appConfig.summaryMaxParagraphs,
      maxChars: c.var.appConfig.summaryMaxChars,
    },
  );

  // Attach media
  if (body.mediaIds && body.mediaIds.length > 0) {
    await c.var.services.media.attachToPost(post.id, body.mediaIds);
  }

  const mediaList = await c.var.services.media.getByPostId(post.id);
  const { r2PublicUrl, imageTransformUrl, s3PublicUrl } = c.var.appConfig;

  return c.json(
    {
      ...post,
      mediaAttachments: mediaList.map((m) =>
        toMediaAttachment(m, r2PublicUrl, imageTransformUrl, s3PublicUrl),
      ),
    },
    201,
  );
});

// Update post (requires auth)
postsApiRoutes.put("/:id", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"));

  const body = parseValidated(UpdatePostSchema, await c.req.json());

  // Validate media IDs if provided
  if (body.mediaIds !== undefined) {
    await c.var.services.media.validateIds(body.mediaIds);
  }

  const post = assertFound(
    await c.var.services.posts.update(
      id,
      {
        format: body.format,
        title: body.title,
        body: body.body,
        bodyMarkdown: body.bodyMarkdown,
        slug: body.slug,
        status: body.status,
        visibility: body.visibility,
        pinned: body.pinned,
        featured: body.featured,
        url: body.url,
        quoteText: body.quoteText,
        rating: body.rating || undefined,
        collectionIds: body.collectionIds,
        publishedAt: body.publishedAt,
      },
      {
        maxParagraphs: c.var.appConfig.summaryMaxParagraphs,
        maxChars: c.var.appConfig.summaryMaxChars,
      },
    ),
    "Post",
  );

  // Update media attachments if provided (including empty array to clear)
  if (body.mediaIds !== undefined) {
    await c.var.services.media.attachToPost(post.id, body.mediaIds);
  }

  const mediaList = await c.var.services.media.getByPostId(post.id);
  const { r2PublicUrl, imageTransformUrl, s3PublicUrl } = c.var.appConfig;

  return c.json({
    ...post,
    mediaAttachments: mediaList.map((m) =>
      toMediaAttachment(m, r2PublicUrl, imageTransformUrl, s3PublicUrl),
    ),
  });
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
