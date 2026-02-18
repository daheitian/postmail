/**
 * Collection Icon Utilities
 *
 * Handles structured icon data (Lucide icons with color) stored as JSON in the DB.
 * Backward-compatible with legacy emoji/text icon values.
 */

import * as lucideIcons from "lucide-static";

/** Structured icon data stored as JSON in the DB `icon` column */
export interface CollectionIcon {
  name: string;
  svg: string;
  color: string;
}

/** Curated color presets for the icon picker */
export const ICON_COLOR_PRESETS = [
  { name: "gray", value: "#6b7280" },
  { name: "red", value: "#ef4444" },
  { name: "orange", value: "#f97316" },
  { name: "amber", value: "#f59e0b" },
  { name: "green", value: "#22c55e" },
  { name: "teal", value: "#14b8a6" },
  { name: "blue", value: "#3b82f6" },
  { name: "indigo", value: "#6366f1" },
  { name: "purple", value: "#a855f7" },
  { name: "pink", value: "#ec4899" },
] as const;

export const DEFAULT_ICON_NAME = "library";
export const DEFAULT_ICON_COLOR = "#6b7280";

/**
 * Convert a kebab-case icon name to PascalCase for lucide-static lookup.
 *
 * @param name - Kebab-case icon name (e.g. "book-open")
 * @returns PascalCase string (e.g. "BookOpen")
 *
 * @example
 * ```typescript
 * toPascalCase("book-open") // "BookOpen"
 * toPascalCase("library") // "Library"
 * ```
 */
function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Get SVG string for a Lucide icon by kebab-case name.
 *
 * @param name - Kebab-case icon name (e.g. "book-open", "library")
 * @returns SVG string or null if icon not found
 *
 * @example
 * ```typescript
 * const svg = getIconSvg("library");
 * // '<svg class="lucide lucide-library" ...'
 * ```
 */
export function getIconSvg(name: string): string | null {
  const pascalName = toPascalCase(name);
  const svg = (lucideIcons as Record<string, string>)[pascalName];
  return typeof svg === "string" ? svg : null;
}

/**
 * Parse a collection icon value from the DB.
 * Returns structured icon data or null for legacy emoji/text values or invalid JSON.
 *
 * @param icon - Raw icon string from the DB (JSON or legacy emoji/text)
 * @returns Parsed CollectionIcon or null
 *
 * @example
 * ```typescript
 * parseCollectionIcon('{"name":"library","svg":"<svg...","color":"#6b7280"}')
 * // { name: "library", svg: "<svg...", color: "#6b7280" }
 *
 * parseCollectionIcon("📚") // null (legacy emoji)
 * parseCollectionIcon(null) // null
 * ```
 */
export function parseCollectionIcon(
  icon: string | null,
): CollectionIcon | null {
  if (!icon || !icon.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(icon) as Record<string, unknown>;
    if (
      typeof parsed.name === "string" &&
      typeof parsed.svg === "string" &&
      typeof parsed.color === "string"
    ) {
      return parsed as unknown as CollectionIcon;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create a JSON string for storing a structured icon in the DB.
 *
 * @param name - Kebab-case icon name
 * @param svg - SVG string
 * @param color - Hex color string
 * @returns JSON string for DB storage
 *
 * @example
 * ```typescript
 * createIconValue("library", "<svg...", "#6b7280")
 * // '{"name":"library","svg":"<svg...","color":"#6b7280"}'
 * ```
 */
export function createIconValue(
  name: string,
  svg: string,
  color: string,
): string {
  return JSON.stringify({ name, svg, color });
}

/**
 * Render a collection icon as an HTML string.
 *
 * - Structured icon (JSON) -> colored SVG
 * - Legacy emoji/text -> span with text
 * - null + fallback -> default icon SVG
 * - null without fallback -> empty string
 *
 * @param icon - Raw icon string from the DB
 * @param opts - Rendering options
 * @param opts.size - Icon size in pixels (default: 24)
 * @param opts.fallback - Whether to render default icon when icon is null (default: false)
 * @returns HTML string
 *
 * @example
 * ```typescript
 * renderCollectionIcon('{"name":"library","svg":"<svg...","color":"#3b82f6"}', { size: 16 })
 * // '<svg ... style="color: #3b82f6" width="16" height="16">...</svg>'
 *
 * renderCollectionIcon("📚")
 * // '<span>📚</span>'
 *
 * renderCollectionIcon(null, { fallback: true })
 * // '<svg ... (default library icon)>'
 * ```
 */
export function renderCollectionIcon(
  icon: string | null,
  opts?: { size?: number; fallback?: boolean },
): string {
  const size = opts?.size ?? 24;

  const parsed = parseCollectionIcon(icon);
  if (parsed) {
    return applyIconSize(parsed.svg, size, parsed.color);
  }

  // Legacy emoji/text value
  if (icon) {
    return `<span>${escapeHtml(icon)}</span>`;
  }

  // Null — optionally show fallback
  if (opts?.fallback) {
    const defaultSvg = getIconSvg(DEFAULT_ICON_NAME);
    if (defaultSvg) {
      return applyIconSize(defaultSvg, size, DEFAULT_ICON_COLOR);
    }
  }

  return "";
}

/**
 * Apply size and color to an SVG string by replacing width/height attributes
 * and adding a style attribute for color.
 */
function applyIconSize(svg: string, size: number, color?: string): string {
  let result = svg
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`);
  if (color) {
    result = result.replace("<svg", `<svg style="color: ${color}"`);
  }
  return result;
}

/** Minimal HTML escaping for legacy emoji/text values */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
