/**
 * Normalize a user-visible text value.
 *
 * Trims surrounding whitespace and collapses empty or visually empty results
 * to `undefined` so callers can distinguish missing display copy from
 * intentionally present text.
 *
 * @param value - Candidate display text
 * @returns Trimmed text, or `undefined` when empty
 * @example
 * ```ts
 * normalizeDisplayText("  Hosted account  ");
 * // Returns: "Hosted account"
 * ```
 */
const VISUALLY_EMPTY_FORMATTING_CHARS = /\u200B|\u200C|\u200D|\u2060|\uFEFF/g;

export function normalizeDisplayText(
  value: string | null | undefined,
): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.replace(VISUALLY_EMPTY_FORMATTING_CHARS, "")
    ? normalized
    : undefined;
}

/**
 * Return the first non-empty display text from a list of candidates.
 *
 * Useful when UI copy needs a stable fallback chain such as configured label →
 * hostname → generic translated label.
 *
 * @param values - Candidate display text values in priority order
 * @returns The first trimmed non-empty candidate, or `undefined`
 * @example
 * ```ts
 * coalesceDisplayText("   ", undefined, "Hosted account");
 * // Returns: "Hosted account"
 * ```
 */
export function coalesceDisplayText(
  ...values: readonly (string | null | undefined)[]
): string | undefined {
  for (const value of values) {
    const normalized = normalizeDisplayText(value);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}
