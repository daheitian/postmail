/**
 * RSS Feed Routes
 *
 * Feed hierarchy:
 * - /feed                  — site main feed (latest or featured, site-configurable)
 * - /feed/latest           — latest public posts
 * - /feed/featured        — featured posts only
 * - /{slug}/feed          — single-collection feed (handled in page routes)
 * - /collections/{slug}/feed — combined collection feed (handled in collection routes)
 */

import { msg } from "@lingui/core/macro";
import { Hono } from "hono";
import type { Context } from "hono";
import type { Bindings, FeedData, FeedKind, Format } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { defaultRssRenderer, defaultAtomRenderer } from "../../lib/feed.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { getI18n } from "../../i18n/index.js";
import { toISOString } from "../../lib/time.js";
import { FORMATS } from "../../types/constants.js";

import { createMediaContext, toPostViews } from "../../lib/view.js";
import { toAbsoluteSiteUrl, toPublicPath } from "../../lib/url.js";
import { toPlainText } from "../../lib/markdown.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const rssRoutes = new Hono<Env>();

interface FeedOptions {
  kind: FeedKind;
  selfPath: string;
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
  opts: FeedOptions,
): Promise<FeedData> {
  const { appConfig } = c.var;
  const i18n = getI18n(c);
  const siteName = appConfig.siteName;
  const siteDescription = toPlainText(appConfig.siteDescription);
  const siteUrl = appConfig.siteUrl;
  const siteLanguage = appConfig.siteLanguage;
  const feedLimit = appConfig.rssFeedLimit;
  const kind = opts.kind;

  const posts = await c.var.services.posts.list({
    status: "published",
    excludeReplies: true,
    featured: kind === "featured" ? true : undefined,
    excludeLatestHidden: kind === "latest",
    excludePrivate: true,
    format: opts.format,
    limit: feedLimit,
  });

  // Batch load media for enclosures
  const postIds = posts.map((p) => p.id);
  const [rawMediaMap, aliasesMap] = await Promise.all([
    c.var.services.media.getByPostIds(postIds),
    c.var.services.paths.getPostAliases(postIds),
  ]);
  const mediaCtx = createMediaContext(appConfig);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
    mediaCtx.localPublicUrl,
    mediaCtx.sitePathPrefix,
  );

  // Build alias map (postId → first alias path)
  const aliasMap = new Map<string, string>();
  for (const [id, aliases] of aliasesMap) {
    if (aliases[0]) aliasMap.set(id, aliases[0]);
  }

  // Transform to PostView[] with media
  const postViews = toPostViews(
    posts.map((p) => ({
      ...p,
      mediaAttachments: mediaMap.get(p.id) ?? [],
    })),
    mediaCtx,
    undefined,
    aliasMap,
  ).map((post, index) => {
    const featuredAt = kind === "featured" ? posts[index]?.featuredAt : null;
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
    title:
      kind === "featured"
        ? `${siteName} - ${i18n._(
            msg({
              message: "Featured posts",
              comment:
                "@context: RSS and Atom feed title suffix for the featured posts feed",
            }),
          )}`
        : `${siteName} - ${i18n._(
            msg({
              message: "Latest posts",
              comment:
                "@context: RSS and Atom feed title suffix for the latest public posts feed",
            }),
          )}`,
    selfUrl: toAbsoluteSiteUrl(
      opts.selfPath,
      siteUrl,
      appConfig.sitePathPrefix,
    ),
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

function renderFeed(xml: string, type: "rss" | "atom") {
  return new Response(xml, {
    headers: {
      "Content-Type":
        type === "rss"
          ? "application/rss+xml; charset=utf-8"
          : "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=180",
    },
  });
}

function redirectToLatest(c: Context<Env>, atom = false): Response {
  const sitePathPrefix = c.var.appConfig.sitePathPrefix;
  const suffix = atom ? "/feed/latest/atom.xml" : "/feed/latest";
  const qs = c.req.url.includes("?")
    ? c.req.url.slice(c.req.url.indexOf("?"))
    : "";
  return c.redirect(`${toPublicPath(suffix, sitePathPrefix)}${qs}`, 308);
}

// RSS 2.0 — /feed
rssRoutes.get("/", async (c) => {
  const kind = c.var.appConfig.mainRssFeed === "latest" ? "latest" : "featured";
  const feedData = await buildFeedData(c, { kind, selfPath: "/feed" });
  return renderFeed(defaultRssRenderer(feedData), "rss");
});

// Atom — /feed/atom.xml
rssRoutes.get("/atom.xml", async (c) => {
  const kind = c.var.appConfig.mainRssFeed === "latest" ? "latest" : "featured";
  const feedData = await buildFeedData(c, { kind, selfPath: "/feed/atom.xml" });
  return renderFeed(defaultAtomRenderer(feedData), "atom");
});

// RSS 2.0 — /feed/latest
rssRoutes.get("/latest", async (c) => {
  const format = parseFormatQuery(c);
  const feedData = await buildFeedData(c, {
    kind: "latest",
    selfPath: "/feed/latest",
    format,
  });
  return renderFeed(defaultRssRenderer(feedData), "rss");
});

// Atom — /feed/latest/atom.xml
rssRoutes.get("/latest/atom.xml", async (c) => {
  const format = parseFormatQuery(c);
  const feedData = await buildFeedData(c, {
    kind: "latest",
    selfPath: "/feed/latest/atom.xml",
    format,
  });
  return renderFeed(defaultAtomRenderer(feedData), "atom");
});

// RSS 2.0 — /feed/featured
rssRoutes.get("/featured", async (c) => {
  const feedData = await buildFeedData(c, {
    kind: "featured",
    selfPath: "/feed/featured",
  });
  return renderFeed(defaultRssRenderer(feedData), "rss");
});

// Atom — /feed/featured/atom.xml
rssRoutes.get("/featured/atom.xml", async (c) => {
  const feedData = await buildFeedData(c, {
    kind: "featured",
    selfPath: "/feed/featured/atom.xml",
  });
  return renderFeed(defaultAtomRenderer(feedData), "atom");
});

// Legacy aliases
rssRoutes.get("/all", (c) => redirectToLatest(c));
rssRoutes.get("/all/atom.xml", (c) => redirectToLatest(c, true));
