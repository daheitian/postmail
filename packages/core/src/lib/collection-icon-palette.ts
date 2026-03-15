/**
 * Collection icon palette definitions.
 *
 * Separates semantic palette ids from concrete CSS token values so icon data can
 * store stable names while themes decide the actual rendered colors.
 */

/** Curated icon palette ids for the collection picker. */
export const ICON_COLOR_PRESETS = [
  { name: "stone" },
  { name: "clay" },
  { name: "rust" },
  { name: "ochre" },
  { name: "moss" },
  { name: "sea" },
  { name: "slate" },
  { name: "indigo" },
  { name: "plum" },
  { name: "rose" },
] as const;

export type CollectionIconPalette = (typeof ICON_COLOR_PRESETS)[number]["name"];

export const DEFAULT_ICON_PALETTE: CollectionIconPalette =
  ICON_COLOR_PRESETS[0].name;

const ICON_PALETTE_SET = new Set<string>(
  ICON_COLOR_PRESETS.map((preset) => preset.name),
);

const LEGACY_ICON_COLOR_TO_PALETTE: Readonly<
  Record<string, CollectionIconPalette>
> = {
  "#6b7280": "stone",
  "#ef4444": "clay",
  "#f97316": "rust",
  "#f59e0b": "ochre",
  "#22c55e": "moss",
  "#14b8a6": "sea",
  "#3b82f6": "slate",
  "#6366f1": "indigo",
  "#a855f7": "plum",
  "#ec4899": "rose",
};

/**
 * Check whether a string is a valid collection icon palette id.
 *
 * @param value - Candidate palette id
 * @returns True when the value matches a known palette id
 *
 * @example
 * ```typescript
 * isCollectionIconPalette("stone"); // true
 * isCollectionIconPalette("blue"); // false
 * ```
 */
export function isCollectionIconPalette(
  value: string,
): value is CollectionIconPalette {
  return ICON_PALETTE_SET.has(value);
}

/**
 * Convert a palette id to the CSS variable used for rendering.
 *
 * @param palette - Semantic palette id
 * @returns CSS color reference using the collection icon token namespace
 *
 * @example
 * ```typescript
 * getCollectionIconColorVar("stone");
 * // "var(--collection-icon-stone)"
 * ```
 */
export function getCollectionIconColorVar(
  palette: CollectionIconPalette,
): string {
  return `var(--collection-icon-${palette})`;
}

/**
 * Resolve a legacy built-in hex color to the current semantic palette id.
 *
 * @param color - Legacy hex color from older icon payloads
 * @returns Matching palette id or null when the color is not a built-in preset
 *
 * @example
 * ```typescript
 * mapLegacyCollectionIconColor("#3b82f6");
 * // "slate"
 * ```
 */
export function mapLegacyCollectionIconColor(
  color: string,
): CollectionIconPalette | null {
  return LEGACY_ICON_COLOR_TO_PALETTE[color.toLowerCase()] ?? null;
}
