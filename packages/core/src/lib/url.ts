/**
 * URL Utilities
 */

import limax from "limax";

/**
 * Extracts the hostname (domain) from a URL string.
 *
 * Parses a full URL and returns just the hostname portion (e.g., "example.com" from
 * "https://example.com/path"). Returns `null` if the URL is malformed or cannot be parsed.
 *
 * @param url - The full URL string to extract the domain from
 * @returns The hostname/domain if valid, or `null` if parsing fails
 *
 * @example
 * ```ts
 * const domain = extractDomain("https://www.example.com/path");
 * // Returns: "www.example.com"
 *
 * const invalid = extractDomain("not-a-url");
 * // Returns: null
 * ```
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Normalizes a path by removing slashes and converting to lowercase.
 *
 * Trims whitespace, converts to lowercase, removes leading and trailing slashes,
 * and collapses multiple consecutive slashes into single slashes. Used to create
 * consistent path representations for routing and storage.
 *
 * @param path - The path string to normalize
 * @returns The normalized path string
 *
 * @example
 * ```ts
 * const normalized = normalizePath("  /About/Contact//  ");
 * // Returns: "about/contact"
 * ```
 */
export function normalizePath(path: string): string {
  return path
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/");
}

/**
 * Checks if a string is a full URL with HTTP or HTTPS protocol.
 *
 * Validates whether a string starts with "http://" or "https://", indicating it's
 * a full URL rather than a relative path. Useful for distinguishing between internal
 * paths and external URLs.
 *
 * @param str - The string to check
 * @returns `true` if the string starts with http:// or https://, `false` otherwise
 *
 * @example
 * ```ts
 * isFullUrl("https://example.com");  // Returns: true
 * isFullUrl("/about");               // Returns: false
 * isFullUrl("example.com");          // Returns: false
 * ```
 */
export function isFullUrl(str: string): boolean {
  return str.startsWith("http://") || str.startsWith("https://");
}

/**
 * Converts text to a URL-friendly slug.
 *
 * Transforms text into a lowercase, hyphen-separated slug using limax for
 * i18n-aware transliteration (CJK → Pinyin, Japanese → Romaji, accented → ASCII).
 *
 * @param text - The text to convert to a slug
 * @returns The slugified string
 *
 * @example
 * ```ts
 * slugify("Hello World! This is a Test.");
 * // Returns: "hello-world-this-is-a-test"
 *
 * slugify("书评");
 * // Returns: "shu-ping"
 * ```
 */
export function slugify(text: string): string {
  return limax(text, { tone: false }).replace(/_/g, "-");
}

/**
 * Extracts a human-friendly domain name from a URL for display purposes.
 *
 * Parses the URL, strips common prefixes (`www.`, `m.`, `mobile.`), and returns
 * a clean domain. Returns `null` if the URL is malformed.
 *
 * @param url - The full URL string
 * @returns A display-friendly domain string, or `null` if parsing fails
 *
 * @example
 * ```ts
 * extractDisplayDomain("https://www.example.com/path");
 * // Returns: "example.com"
 *
 * extractDisplayDomain("https://m.wikipedia.org/wiki/Test");
 * // Returns: "wikipedia.org"
 *
 * extractDisplayDomain("https://blog.example.com");
 * // Returns: "blog.example.com"
 * ```
 */
export function extractDisplayDomain(url: string): string | null {
  const hostname = extractDomain(url);
  if (!hostname) return null;
  return hostname.replace(/^(?:www|m|mobile)\./, "");
}

const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/**
 * Sanitizes a URL by ensuring it uses a safe protocol.
 *
 * Returns the URL unchanged if it uses an allowed protocol (http:, https:, mailto:)
 * or is a relative path. Returns an empty string for dangerous protocols like
 * `javascript:`, `data:`, or `vbscript:`.
 *
 * @param url - The URL string to sanitize
 * @returns The original URL if safe, or an empty string if the protocol is disallowed
 *
 * @example
 * ```ts
 * sanitizeUrl("https://example.com");       // "https://example.com"
 * sanitizeUrl("/about");                     // "/about"
 * sanitizeUrl("javascript:alert(1)");        // ""
 * sanitizeUrl("data:text/html,<h1>Hi</h1>"); // ""
 * ```
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, "https://placeholder.invalid");
    // Relative URLs resolve against the placeholder and get https: — allow them
    if (SAFE_URL_PROTOCOLS.has(parsed.protocol)) return url;
    return "";
  } catch {
    return "";
  }
}
