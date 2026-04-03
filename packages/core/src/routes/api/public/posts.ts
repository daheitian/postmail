import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Collection, Media, Post } from "../../../types.js";
import type { AppVariables } from "../../../types/app-context.js";
import { FormatSchema, parseValidated } from "../../../lib/schemas.js";
import { NotFoundError } from "../../../lib/errors.js";
import { toApiAttachment } from "../../../lib/api-posts.js";
import { toPublicPath } from "../../../lib/url.js";
import {
  getImageUrl,
  getMediaUrl,
  getPublicUrlForProvider,
} from "../../../lib/image.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const publicPostsApiRoutes = new Hono<Env>();

const ListPublicPostsQuerySchema = z.object({
  format: FormatSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

type PublicPostResponse = {
  id: string;
  format: Post["format"];
  status: "published";
  visibility: Post["visibility"];
  slug: string;
  permalink: string;
  title?: string | null;
  url?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  quoteText: string | null;
  summary: string | null;
  rating: number | null;
  previewKind: string | null;
  previewProvider: string | null;
  previewImageUrl: string | null;
  replyToId: string | null;
  threadId: string;
  pinnedAt: number | null;
  featuredAt: number | null;
  publishedAt: number | null;
  lastActivityAt: number;
  createdAt: number;
  updatedAt: number;
  attachments: ReturnType<typeof toApiAttachment>[];
  collections: {
    id: string;
    slug: string;
    title: string;
    url: string;
  }[];
};

function isPublicDetailVisible(post: Post | null): post is Post {
  return (
    post !== null &&
    post.status === "published" &&
    post.visibility !== "private"
  );
}

function toPublicPost(
  post: Post,
  mediaList: Media[],
  postCollections: Collection[],
  appConfig: AppVariables["appConfig"],
): PublicPostResponse {
  const {
    r2PublicUrl,
    imageTransformUrl,
    s3PublicUrl,
    localPublicUrl,
    sitePathPrefix,
    storageDriver,
  } = appConfig;

  const previewImagePublicUrl = getPublicUrlForProvider(
    storageDriver,
    r2PublicUrl,
    s3PublicUrl,
    localPublicUrl,
  );
  const previewImageUrl = post.previewImageKey
    ? getImageUrl(
        getMediaUrl(
          post.previewImageKey,
          previewImagePublicUrl,
          sitePathPrefix,
        ),
        imageTransformUrl,
        { width: 1280, quality: 80, format: "auto", fit: "scale-down" },
      )
    : null;

  const base = {
    id: post.id,
    format: post.format,
    status: "published" as const,
    visibility: post.visibility,
    slug: post.slug,
    permalink: toPublicPath(`/${post.slug}`, sitePathPrefix),
    bodyHtml: post.bodyHtml,
    bodyText: post.bodyText,
    quoteText: post.quoteText,
    summary: post.summary,
    rating: post.rating,
    previewKind: post.previewKind,
    previewProvider: post.previewProvider,
    previewImageUrl,
    replyToId: post.replyToId,
    threadId: post.threadId,
    pinnedAt: post.pinnedAt,
    featuredAt: post.featuredAt,
    publishedAt: post.publishedAt,
    lastActivityAt: post.lastActivityAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    attachments: mediaList.map((media) =>
      toApiAttachment(
        media,
        r2PublicUrl,
        imageTransformUrl,
        s3PublicUrl,
        localPublicUrl,
        sitePathPrefix,
      ),
    ),
    collections: postCollections.map((collection) => ({
      id: collection.id,
      slug: collection.slug,
      title: collection.title,
      url: toPublicPath(`/c/${collection.slug}`, sitePathPrefix),
    })),
  };

  if (post.format === "quote") {
    return {
      ...base,
      sourceName: post.title,
      sourceUrl: post.url,
    };
  }

  return {
    ...base,
    title: post.title,
    url: post.url,
  };
}

publicPostsApiRoutes.get("/", async (c) => {
  const { format, cursor, limit } = parseValidated(
    ListPublicPostsQuerySchema,
    c.req.query(),
  );

  const posts = await c.var.services.posts.list({
    format,
    status: "published",
    cursor: cursor ?? undefined,
    limit,
    excludePrivate: true,
    excludeLatestHidden: true,
    excludeReplies: true,
  });

  const postIds = posts.map((post) => post.id);
  const [mediaMap, collectionsMap] = await Promise.all([
    c.var.services.media.getByPostIds(postIds),
    c.var.services.collections.getCollectionsByPostIds(postIds),
  ]);

  return c.json({
    posts: posts.map((post) =>
      toPublicPost(
        post,
        mediaMap.get(post.id) ?? [],
        collectionsMap.get(post.id) ?? [],
        c.var.appConfig,
      ),
    ),
    nextCursor:
      posts.length === limit ? (posts[posts.length - 1]?.id ?? null) : null,
  });
});

publicPostsApiRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const post = await c.var.services.posts.getBySlug(slug);

  if (!isPublicDetailVisible(post)) {
    throw new NotFoundError("Post");
  }

  const [mediaList, postCollections] = await Promise.all([
    c.var.services.media.getByPostId(post.id),
    c.var.services.collections.getCollectionsByPostId(post.id),
  ]);

  return c.json(
    toPublicPost(post, mediaList, postCollections, c.var.appConfig),
  );
});
