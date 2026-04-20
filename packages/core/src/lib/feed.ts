/**
 * Default Feed Renderers
 *
 * Atom and Sitemap XML generators.
 * Theme authors can import these to extend/wrap the defaults:
 *
 * @example
 * ```typescript
 * import { defaultFeedRenderer } from "@jant/core/lib/feed";
 * ```
 */

import type { FeedData, FeedPostView, PostView } from "../types.js";
import { extractDisplayDomain } from "./url.js";

/**
 * Escape special XML characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Escape content for safe embedding inside a CDATA section.
 *
 * CDATA sections end at the first `]]>` sequence. If the content contains
 * `]]>`, we split it by closing the current CDATA section and opening a new
 * one: `]]>` becomes `]]]]><![CDATA[>`.
 *
 * @param str - Raw string to embed in CDATA
 * @returns String safe to place inside `<![CDATA[...]]>`
 */
function escapeCdata(str: string): string {
  return str.replaceAll("]]>", "]]]]><![CDATA[>");
}

/**
 * Strip embedded content that is unsafe or unsupported in feed readers.
 *
 * - `<figure class="tiptap-embed-figure">` is replaced by its fallback link
 *   (rendered by `renderEmbedFigure`), so subscribers still get a clickable
 *   "Watch on YouTube →" line. Atom/RSS readers reject `<iframe>` outright.
 * - `<div class="tiptap-html-block">` (raw HTML escape hatch) is dropped
 *   wholesale — author-pasted HTML is for the live site only.
 * - Stray `<iframe>`, `<script>`, and `<style>` are removed defensively.
 */
function stripUnsafeFeedHtml(html: string): string {
  return html
    .replaceAll(
      /<figure\b[^>]*class="[^"]*\btiptap-embed-figure\b[^"]*"[^>]*>([\s\S]*?)<\/figure>/gi,
      (_match, inner: string) => {
        const fallback = inner.match(
          /<a\b[^>]*class="[^"]*\btiptap-embed-fallback\b[^"]*"[^>]*>[\s\S]*?<\/a>/i,
        );
        return fallback ? `<p>${fallback[0]}</p>` : "";
      },
    )
    .replaceAll(
      /<div\b[^>]*class="[^"]*\btiptap-html-block\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      "",
    )
    .replaceAll(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replaceAll(/<iframe\b[^>]*\/?>/gi, "")
    .replaceAll(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
}

function getFeedSummaryText(post: PostView): string {
  if (post.format === "quote") {
    return (
      post.summary ||
      post.excerpt ||
      post.quoteText ||
      post.title ||
      post.url ||
      `Post #${post.id}`
    );
  }

  return (
    post.summary || post.excerpt || post.title || post.url || `Post #${post.id}`
  );
}

function getAtomTitle(post: PostView): string {
  if (post.format === "quote") return "";
  return post.title || "";
}

/**
 * Render a star rating as HTML for feed content.
 */
function renderRatingHtml(rating: number): string {
  const filled = "★".repeat(rating);
  const empty = "☆".repeat(5 - rating);
  return `<p>${filled}${empty} ${rating}/5</p>`;
}

/**
 * Build the HTML content for a single post (root or reply).
 *
 * @param post - Post view data
 * @param permalinkUrl - Absolute permalink URL back to the blog post
 */
function buildSinglePostContent(post: PostView, permalinkUrl?: string): string {
  const parts: string[] = [];

  if (post.format === "quote" && post.quoteText) {
    const sourceName = post.title || "";
    const sourceUrl = post.url || "";
    const attribution = sourceName || sourceUrl;
    const cite = sourceUrl ? ` cite="${escapeXml(sourceUrl)}"` : "";
    parts.push(
      `<blockquote${cite}><p>${escapeXml(post.quoteText)}</p></blockquote>`,
    );
    if (attribution) {
      const source = sourceUrl
        ? `<a href="${escapeXml(sourceUrl)}">${escapeXml(sourceName || extractDisplayDomain(sourceUrl) || sourceUrl)}</a>`
        : escapeXml(attribution);
      parts.push(`<p>— ${source}</p>`);
    }
  }

  if (post.bodyHtml) {
    parts.push(stripUnsafeFeedHtml(post.bodyHtml));
  }

  if (post.rating && post.rating > 0) {
    parts.push(renderRatingHtml(post.rating));
  }

  if (parts.length === 0) {
    parts.push(`<p>${escapeXml(getFeedSummaryText(post))}</p>`);
  }

  // For link posts, append a ★ permalink back to the blog post (Daring Fireball style)
  if (post.format === "link" && permalinkUrl) {
    parts.push(
      `<p><a href="${escapeXml(permalinkUrl)}" title="Permalink">&nbsp;★&nbsp;</a></p>`,
    );
  }

  return parts.join("\n");
}

/**
 * Build the full HTML content for a feed entry, including thread replies.
 *
 * @param post - Root post view data
 * @param siteUrl - Site base URL for building absolute permalinks
 * @param permalinkUrl - Absolute permalink URL for the root post
 */
function buildFeedContent(
  post: FeedPostView,
  siteUrl: string,
  permalinkUrl?: string,
): string {
  const rootContent = buildSinglePostContent(post, permalinkUrl);
  const replies = post.threadReplies;

  if (!replies || replies.length === 0) {
    return rootContent;
  }

  const parts = [rootContent];

  for (const reply of replies) {
    const replyPermalink = new URL(reply.permalink, siteUrl).toString();
    parts.push("<hr/>");
    parts.push(
      `<p><small><time datetime="${escapeXml(reply.publishedAt)}">${escapeXml(reply.publishedAtFormatted)}</time></small></p>`,
    );
    parts.push(buildSinglePostContent(reply, replyPermalink));
  }

  return parts.join("\n");
}

/**
 * Default Atom feed renderer.
 *
 * @param data - Feed data with FeedPostView[] (pre-computed URLs)
 * @returns Atom XML string
 */
export function defaultFeedRenderer(data: FeedData): string {
  const { siteName, siteDescription, siteUrl, title, selfUrl, posts } = data;
  const feedTitle = title ?? siteName;

  const entries = posts
    .map((post) => {
      const permalinkUrl = new URL(post.permalink, siteUrl).toString();
      const escapedPermalink = escapeXml(permalinkUrl);
      // Link-format posts point <link rel="alternate"> to the original URL
      const alternateUrl = post.format === "link" ? post.url : null;
      const alternateLink = alternateUrl
        ? escapeXml(alternateUrl)
        : escapedPermalink;
      const title = getAtomTitle(post);
      const summary = getFeedSummaryText(post);
      const publishedAt = post.feedPublishedAt ?? post.publishedAt;
      const updatedAt = post.feedUpdatedAt ?? post.updatedAt;

      // For link posts, add a <link rel="related"> back to the blog permalink
      const relatedLink = alternateUrl
        ? `\n    <link href="${escapedPermalink}" rel="related"/>`
        : "";

      return `
  <entry>
    <title>${escapeXml(title)}</title>
    <link href="${alternateLink}" rel="alternate"/>${relatedLink}
    <id>${escapedPermalink}</id>
    <published>${publishedAt}</published>
    <updated>${updatedAt}</updated>
    <summary type="text">${escapeXml(summary)}</summary>
    <content type="html"><![CDATA[${escapeCdata(buildFeedContent(post, siteUrl, alternateUrl ? permalinkUrl : undefined))}]]></content>
  </entry>`;
    })
    .join("");

  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(feedTitle)}</title>
  <subtitle>${escapeXml(siteDescription)}</subtitle>
  <link href="${escapeXml(siteUrl)}" rel="alternate"/>
  <link href="${escapeXml(selfUrl)}" rel="self"/>
  <id>${escapeXml(selfUrl)}</id>
  <updated>${now}</updated>
  ${entries}
</feed>`;
}

/**
 * Maximum URLs per sitemap shard. The sitemap.xml spec allows up to 50,000
 * per file; 500 keeps individual shards cheap to generate on D1 and makes old
 * (already-filled) shards small enough to cache aggressively at the edge.
 */
export const SITEMAP_SHARD_SIZE = 500;

/** One `<url>` entry inside a sitemap `<urlset>`. */
export interface SitemapUrlEntry {
  loc: string;
  /** ISO date (YYYY-MM-DD) or full ISO datetime */
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  /** "0.0" – "1.0" */
  priority?: string;
}

/** One `<sitemap>` entry inside a `<sitemapindex>`. */
export interface SitemapIndexEntry {
  loc: string;
  lastmod?: string;
}

/**
 * Render a sitemap `<urlset>` XML document from a list of URL entries.
 *
 * Used by the sharded sitemap endpoints in `routes/feed/sitemap.ts`.
 */
export function renderSitemapUrlSet(entries: SitemapUrlEntry[]): string {
  const urls = entries
    .map((entry) => {
      const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`];
      if (entry.lastmod) {
        parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      }
      if (entry.changefreq) {
        parts.push(
          `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`,
        );
      }
      if (entry.priority) {
        parts.push(`    <priority>${escapeXml(entry.priority)}</priority>`);
      }
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * Render a `<sitemapindex>` XML document listing shard sitemap URLs.
 */
export function renderSitemapIndex(entries: SitemapIndexEntry[]): string {
  const items = entries
    .map((entry) => {
      const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`];
      if (entry.lastmod) {
        parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      }
      return `  <sitemap>\n${parts.join("\n")}\n  </sitemap>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>`;
}
