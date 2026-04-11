/**
 * Generic field-level search ranking used by the command palette
 * and the collection picker.
 *
 * Match priority (lower = better):
 *   0 — exact match
 *   1 — starts-with
 *   2 — a word/token starts with the query
 *   3 — substring (includes)
 *   null — no match
 *
 * @param value - The field value to test
 * @param search - Lowercase, trimmed query
 * @returns Rank number or null if no match
 */
export function getFieldSearchRank(
  value: string | null | undefined,
  search: string,
): number | null {
  const normalized = normalizeSearch(value);
  if (!normalized) return null;

  if (normalized === search) return 0;
  if (normalized.startsWith(search)) return 1;

  const tokens = normalized.split(/[\s\-_.:/]+/).filter(Boolean);
  if (tokens.some((token) => token.startsWith(search))) return 2;

  return normalized.includes(search) ? 3 : null;
}

export function normalizeSearch(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}
