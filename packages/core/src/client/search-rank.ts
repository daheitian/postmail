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
function getFieldSearchRank(
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

/**
 * Returns the best rank across multiple field values.
 *
 * @param values - Field values to test
 * @param search - Lowercase, trimmed query
 * @returns Best rank across all fields, or null if none match
 */
export function getBestFieldSearchRank(
  values: ReadonlyArray<string | null | undefined>,
  search: string,
): number | null {
  let best: number | null = null;
  for (const value of values) {
    const rank = getFieldSearchRank(value, search);
    if (rank === 0) return 0;
    if (rank !== null && (best === null || rank < best)) best = rank;
  }
  return best;
}

export function normalizeSearch(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}
