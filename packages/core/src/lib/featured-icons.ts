/**
 * Shared icon definitions for featured post affordances.
 *
 * These paths are reused across Hono JSX, Lit, and exported static markup so
 * "Featured" keeps one visual language everywhere.
 */

export const FEATURED_SPARKLE_PATH =
  "M12 3 10.1 10.1 3 12l7.1 1.9L12 21l1.9-7.1L21 12l-7.1-1.9Z";

export const FEATURED_SPARKLE_OFF_SLASH_PATH = "M4 4 20 20";

/**
 * Build inline SVG markup for the shared featured sparkle icon.
 *
 * @param options - Render options for the sparkle icon.
 * @returns SVG markup string for inline insertion.
 * @example
 * getFeaturedIconSvg({ off: true, className: "icon-fine" });
 */
export function getFeaturedIconSvg(
  options: {
    off?: boolean;
    className?: string;
  } = {},
): string {
  const classAttr = options.className ? ` class="${options.className}"` : "";
  const offMarkup = options.off
    ? `<path d="${FEATURED_SPARKLE_OFF_SLASH_PATH}" />`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"${classAttr} aria-hidden="true"><path d="${FEATURED_SPARKLE_PATH}" />${offMarkup}</svg>`;
}
