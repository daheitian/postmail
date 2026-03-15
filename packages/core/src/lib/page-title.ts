/**
 * Build a browser page title from ordered segments.
 *
 * Empty segments are skipped so routes can safely compose titles from
 * optional values like pagination labels.
 *
 * @param parts - Ordered title segments from most specific to most general
 * @returns Browser title joined with ` - `
 *
 * @example
 * ```ts
 * buildPageTitle("Search", "My Blog");
 * // "Search - My Blog"
 * ```
 */
export function buildPageTitle(
  ...parts: Array<string | null | undefined>
): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" - ");
}
