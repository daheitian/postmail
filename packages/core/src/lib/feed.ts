/**
 * Default Feed Renderers
 *
 * RSS 2.0, Atom, and Sitemap XML generators.
 * Theme authors can import these to extend/wrap the defaults:
 *
 * @example
 * ```typescript
 * import { defaultRssRenderer } from "@jant/core/lib/feed";
 * ```
 */

import type { FeedData, PostView, SitemapData } from "../types.js";
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

function stripUnsafeFeedHtml(html: string): string {
  return html.replaceAll(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
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
 * Build the full HTML content for a feed item, combining format-specific
 * fields (quote text, source URL) with body and rating.
 *
 * @param post - Post view data
 * @param permalinkUrl - Absolute permalink URL back to the blog post (used for ★ on link posts)
 */
function buildFeedContent(post: PostView, permalinkUrl?: string): string {
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
 * Default RSS 2.0 renderer.
 *
 * @param data - Feed data with PostView[] (pre-computed URLs)
 * @returns RSS 2.0 XML string
 */
export function defaultRssRenderer(data: FeedData): string {
  const {
    siteName,
    siteDescription,
    siteUrl,
    siteLanguage,
    title,
    selfUrl,
    posts,
  } = data;
  const feedTitle = title ?? siteName;

  const items = posts
    .map((post) => {
      const permalinkUrl = new URL(post.permalink, siteUrl).toString();
      const escapedPermalink = escapeXml(permalinkUrl);
      // Link-format posts point <link> to the original URL (Daring Fireball style)
      const itemLink =
        post.format === "link" && post.url
          ? escapeXml(post.url)
          : escapedPermalink;
      const pubDate = new Date(
        post.feedPublishedAt ?? post.publishedAt,
      ).toUTCString();
      const itemTitle = post.format === "quote" ? "" : (post.title ?? "");

      // Add enclosure for first media attachment
      const firstMedia = post.media[0];
      const enclosure = firstMedia
        ? `\n      <enclosure url="${escapeXml(firstMedia.url)}" type="${escapeXml(firstMedia.mimeType)}"${firstMedia.size ? ` length="${firstMedia.size}"` : ""}/>`
        : "";

      return `
    <item>
      ${itemTitle ? `<title><![CDATA[${escapeCdata(itemTitle)}]]></title>\n      ` : ""}<link>${itemLink}</link>
      <guid isPermaLink="true">${escapedPermalink}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${escapeCdata(buildFeedContent(post, post.format === "link" ? permalinkUrl : undefined))}]]></description>${enclosure}
    </item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>${siteLanguage}</language>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
}

/**
 * Default Atom renderer.
 *
 * @param data - Feed data with PostView[] (pre-computed URLs)
 * @returns Atom XML string
 */
export function defaultAtomRenderer(data: FeedData): string {
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
    <content type="html"><![CDATA[${escapeCdata(buildFeedContent(post, alternateUrl ? permalinkUrl : undefined))}]]></content>
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
 * Default Sitemap renderer.
 *
 * @param data - Sitemap data with PostView[]
 * @returns Sitemap XML string
 */
export function defaultSitemapRenderer(data: SitemapData): string {
  const { siteUrl, sitemapUrl, posts } = data;

  const postUrls = posts
    .map((post) => {
      const loc = escapeXml(new URL(post.permalink, siteUrl).toString());
      const lastmod = post.updatedAt.split("T")[0];
      const priority = post.featured ? "0.8" : "0.6";

      return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("");

  const homepageUrl = `
  <url>
    <loc>${escapeXml(siteUrl)}</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
  </url>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Generated from ${escapeXml(sitemapUrl)} -->
  ${homepageUrl}
  ${postUrls}
</urlset>`;
}
