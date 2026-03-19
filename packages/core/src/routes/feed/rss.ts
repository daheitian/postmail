/**
 * RSS Feed Routes
 *
 * Three-level hierarchy:
 * - /feed          — featured posts only (curated feed for subscribers)
 * - /feed/all      — all published posts (with optional ?format= filter)
 * - /c/{slug}/feed — per-collection feed (handled in collection routes)
 */

import { Hono } from "hono";
import type { Context } from "hono";
import type { Bindings, FeedData, Format } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { defaultRssRenderer, defaultAtomRenderer } from "../../lib/feed.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { toISOString } from "../../lib/time.js";
import { FORMATS } from "../../types/constants.js";

import { createMediaContext, toPostViews } from "../../lib/view.js";
import { toAbsoluteSiteUrl } from "../../lib/url.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const rssRoutes = new Hono<Env>();

interface FeedOptions {
  featured?: boolean;
  excludeUnlisted?: boolean;
  excludePrivate?: boolean;
  format?: Format;
}

/**
 * Build FeedData from the Hono context.
 *
 * @param c - Hono context
 * @param opts - Filter options for the feed
 * @returns Feed data ready for rendering
 */
async function buildFeedData(
  c: Context<Env>,
  opts?: FeedOptions,
): Promise<FeedData> {
  const { appConfig } = c.var;
  const siteName = appConfig.siteName;
  const siteDescription = appConfig.siteDescription;
  const siteUrl = appConfig.siteUrl;
  const siteLanguage = appConfig.siteLanguage;
  const feedLimit = appConfig.rssFeedLimit;

  const posts = await c.var.services.posts.list({
    status: "published",
    excludeReplies: true,
    featured: opts?.featured,
    excludeUnlisted: opts?.excludeUnlisted,
    excludePrivate: opts?.excludePrivate ?? true,
    format: opts?.format,
    limit: feedLimit,
  });

  // Batch load media for enclosures
  const postIds = posts.map((p) => p.id);
  const rawMediaMap = await c.var.services.media.getByPostIds(postIds);
  const mediaCtx = createMediaContext(appConfig);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
    mediaCtx.localPublicUrl,
    mediaCtx.sitePathPrefix,
  );

  // Transform to PostView[] with media
  const postViews = toPostViews(
    posts.map((p) => ({
      ...p,
      mediaAttachments: mediaMap.get(p.id) ?? [],
    })),
    mediaCtx,
  ).map((post, index) => {
    const featuredAt = opts?.featured ? posts[index]?.featuredAt : null;
    if (!featuredAt) return post;

    const feedTimestamp = toISOString(featuredAt);
    return {
      ...post,
      feedPublishedAt: feedTimestamp,
      feedUpdatedAt: feedTimestamp,
    };
  });

  return {
    siteName,
    siteDescription,
    siteUrl,
    siteLanguage,
    selfUrl: toAbsoluteSiteUrl("/feed", siteUrl, appConfig.sitePathPrefix),
    posts: postViews,
  };
}

/**
 * Parse and validate the `format` query parameter.
 * Returns a valid Format or undefined if missing/invalid.
 */
function parseFormatQuery(c: Context<Env>): Format | undefined {
  const raw = c.req.query("format");
  if (raw && (FORMATS as readonly string[]).includes(raw)) {
    return raw as Format;
  }
  return undefined;
}

// --- Featured feed (curated) ---

// RSS 2.0 — /feed
rssRoutes.get("/", async (c) => {
  const feedData = await buildFeedData(c, { featured: true });
  const xml = defaultRssRenderer(feedData);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=180",
    },
  });
});

// Atom — /feed/atom.xml
rssRoutes.get("/atom.xml", async (c) => {
  const feedData = await buildFeedData(c, { featured: true });
  feedData.selfUrl = toAbsoluteSiteUrl(
    "/feed/atom.xml",
    feedData.siteUrl,
    c.var.appConfig.sitePathPrefix,
  );
  const xml = defaultAtomRenderer(feedData);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=180",
    },
  });
});

// --- All posts feed ---

// RSS 2.0 — /feed/all
rssRoutes.get("/all", async (c) => {
  const format = parseFormatQuery(c);
  const feedData = await buildFeedData(c, { excludeUnlisted: true, format });
  feedData.selfUrl = toAbsoluteSiteUrl(
    "/feed/all",
    feedData.siteUrl,
    c.var.appConfig.sitePathPrefix,
  );
  const xml = defaultRssRenderer(feedData);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=180",
    },
  });
});

// Atom — /feed/all/atom.xml
rssRoutes.get("/all/atom.xml", async (c) => {
  const format = parseFormatQuery(c);
  const feedData = await buildFeedData(c, { excludeUnlisted: true, format });
  feedData.selfUrl = toAbsoluteSiteUrl(
    "/feed/all/atom.xml",
    feedData.siteUrl,
    c.var.appConfig.sitePathPrefix,
  );
  const xml = defaultAtomRenderer(feedData);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=180",
    },
  });
});
