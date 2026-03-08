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
 */
function buildFeedContent(post: PostView): string {
  const parts: string[] = [];

  if (post.format === "quote" && post.quoteText) {
    const attribution = post.title || post.url || "";
    const cite = post.url ? ` cite="${escapeXml(post.url)}"` : "";
    parts.push(
      `<blockquote${cite}><p>${escapeXml(post.quoteText)}</p></blockquote>`,
    );
    if (attribution) {
      const source = post.url
        ? `<a href="${escapeXml(post.url)}">${escapeXml(post.title || "Source")}</a>`
        : escapeXml(attribution);
      parts.push(`<p>— ${source}</p>`);
    }
  }

  if (post.format === "link" && post.url) {
    parts.push(
      `<p><a href="${escapeXml(post.url)}">${escapeXml(post.url)}</a></p>`,
    );
  }

  if (post.bodyHtml) {
    parts.push(post.bodyHtml);
  }

  if (post.rating && post.rating > 0) {
    parts.push(renderRatingHtml(post.rating));
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
  const { siteName, siteDescription, siteUrl, siteLanguage, posts } = data;

  const items = posts
    .map((post) => {
      const link = `${siteUrl}${post.permalink}`;
      const title = post.title || `Post #${post.id}`;
      const pubDate = new Date(post.publishedAt).toUTCString();

      // Add enclosure for first media attachment
      const firstMedia = post.media[0];
      const enclosure = firstMedia
        ? `\n      <enclosure url="${firstMedia.url}" type="${firstMedia.mimeType}"${firstMedia.size ? ` length="${firstMedia.size}"` : ""}/>`
        : "";

      return `
    <item>
      <title><![CDATA[${escapeXml(title)}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${buildFeedContent(post)}]]></description>${enclosure}
    </item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>${siteLanguage}</language>
    <atom:link href="${siteUrl}/feed" rel="self" type="application/rss+xml"/>
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
  const { siteName, siteDescription, siteUrl, posts } = data;

  const entries = posts
    .map((post) => {
      const link = `${siteUrl}${post.permalink}`;
      const title = post.title || `Post #${post.id}`;

      return `
  <entry>
    <title>${escapeXml(title)}</title>
    <link href="${link}" rel="alternate"/>
    <id>${link}</id>
    <published>${post.publishedAt}</published>
    <updated>${post.updatedAt}</updated>
    <content type="html"><![CDATA[${buildFeedContent(post)}]]></content>
  </entry>`;
    })
    .join("");

  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(siteName)}</title>
  <subtitle>${escapeXml(siteDescription)}</subtitle>
  <link href="${siteUrl}" rel="alternate"/>
  <link href="${siteUrl}/feed/atom.xml" rel="self"/>
  <id>${siteUrl}/</id>
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
  const { siteUrl, posts } = data;

  const postUrls = posts
    .map((post) => {
      const loc = `${siteUrl}${post.permalink}`;
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
    <loc>${siteUrl}/</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
  </url>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${homepageUrl}
  ${postUrls}
</urlset>`;
}
