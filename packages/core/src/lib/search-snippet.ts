/**
 * Search Snippet Utilities
 *
 * Application-layer text highlighting for search results.
 * Used for fields not covered by FTS5 snippet() (title, quoteText).
 *
 * @param text - Plain text to highlight (already stored content, not user input)
 * @param query - Raw search query string (space-separated terms)
 * @returns Text with matched terms wrapped in <mark> tags; original if no terms
 *
 * @example
 * ```ts
 * highlightText("Hello world", "world")
 * // → "Hello <mark>world</mark>"
 *
 * highlightText("TypeScript basics", "type script")
 * // → "<mark>TypeScript</mark> basics"
 * ```
 */
export function highlightText(text: string, query: string): string {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.join("|")})`, "gi");
  return text.replace(pattern, "<mark>$1</mark>");
}
