/**
 * Theme Component Resolution
 *
 * Resolves theme-overridable components, falling back to defaults.
 */

import type { FC } from "hono/jsx";
import type { Format, ThemeComponents, TimelineCardProps } from "../types.js";

const THEME_KEY_MAP: Record<Format, keyof ThemeComponents> = {
  note: "NoteCard",
  link: "LinkCard",
  quote: "QuoteCard",
};

/**
 * Generic component resolver.
 *
 * Looks up a component by key in `ThemeComponents` and falls back to the
 * provided default component.
 *
 * @param key - ThemeComponents key to look up
 * @param defaultComponent - Fallback component
 * @param themeComponents - Optional theme component overrides
 * @returns The resolved component
 *
 * @example
 * ```ts
 * const Gallery = resolveComponent("MediaGallery", DefaultMediaGallery, theme);
 * ```
 */
export function resolveComponent<K extends keyof ThemeComponents>(
  key: K,
  defaultComponent: NonNullable<ThemeComponents[K]>,
  themeComponents?: ThemeComponents,
): NonNullable<ThemeComponents[K]> {
  return (themeComponents?.[key] ?? defaultComponent) as NonNullable<
    ThemeComponents[K]
  >;
}

/**
 * Resolves the card component for a given post format.
 *
 * Checks theme overrides first, then falls back to the provided default card component.
 *
 * @param format - The post format to resolve a card for
 * @param defaults - Map of format to default card component
 * @param themeComponents - Optional theme component overrides
 * @returns The resolved card component
 *
 * @example
 * ```ts
 * const Card = resolveCardComponent("note", DEFAULT_CARD_MAP, c.var.config.theme?.components);
 * ```
 */
export function resolveCardComponent(
  format: Format,
  defaults: Record<Format, FC<TimelineCardProps>>,
  themeComponents?: ThemeComponents,
): FC<TimelineCardProps> {
  const key = THEME_KEY_MAP[format];
  const override = themeComponents?.[key] as FC<TimelineCardProps> | undefined;
  return override ?? defaults[format];
}
