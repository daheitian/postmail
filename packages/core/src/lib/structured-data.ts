/**
 * JSON-LD structured data builders.
 *
 * Produces schema.org objects rendered as `<script type="application/ld+json">`
 * in BaseLayout. Builders return plain objects; serialization and script-safe
 * escaping happen at render time.
 */

export interface ArticleJsonLdInput {
  /** Bare post title (without the site-name suffix). */
  headline: string;
  /** Meta description, when available. */
  description?: string;
  /** Canonical absolute URL of the post page. */
  url: string;
  /** ISO 8601 publish time. */
  datePublished: string;
  /** ISO 8601 last-modified time. */
  dateModified: string;
  /** Absolute URL of the post's social/preview image, when available. */
  imageUrl?: string;
  /** Display name of the site author. */
  authorName: string;
}

/**
 * Build a schema.org `BlogPosting` object for a single post page.
 *
 * `BlogPosting` (a subtype of `Article`) fits a personal microblog better than
 * the generic `Article` type.
 *
 * @param input - Post metadata, with absolute URLs already resolved
 * @returns A JSON-LD-ready `BlogPosting` object
 *
 * @example
 * ```ts
 * buildArticleJsonLd({
 *   headline: "Hello",
 *   url: "https://site.com/hello",
 *   datePublished: "2026-01-01T00:00:00.000Z",
 *   dateModified: "2026-01-02T00:00:00.000Z",
 *   authorName: "Jant",
 * });
 * ```
 */
export function buildArticleJsonLd(
  input: ArticleJsonLdInput,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.headline,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    url: input.url,
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    author: { "@type": "Person", name: input.authorName },
  };
  if (input.description) data.description = input.description;
  if (input.imageUrl) data.image = input.imageUrl;
  return data;
}

export interface WebSiteJsonLdInput {
  /** Site display name. */
  name: string;
  /** Absolute URL of the site root. */
  url: string;
  /**
   * Absolute search URL template containing the literal placeholder
   * `{search_term_string}`, e.g. `https://site.com/search?q={search_term_string}`.
   * Omit to skip the sitelinks search box action.
   */
  searchUrlTemplate?: string;
}

/**
 * Build a schema.org `WebSite` object, optionally with a `SearchAction` that
 * enables Google's sitelinks search box.
 *
 * @param input - Site metadata, with absolute URLs already resolved
 * @returns A JSON-LD-ready `WebSite` object
 *
 * @example
 * ```ts
 * buildWebSiteJsonLd({
 *   name: "Jant",
 *   url: "https://site.com/",
 *   searchUrlTemplate: "https://site.com/search?q={search_term_string}",
 * });
 * ```
 */
export function buildWebSiteJsonLd(
  input: WebSiteJsonLdInput,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: input.url,
  };
  if (input.searchUrlTemplate) {
    data.potentialAction = {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: input.searchUrlTemplate,
      },
      "query-input": "required name=search_term_string",
    };
  }
  return data;
}
