/**
 * Theme Component Resolution
 *
 * Resolves theme-overridable components, falling back to defaults.
 */

import type { FC } from "hono/jsx";
import type {
  PostType,
  ThemeComponents,
  TimelineCardProps,
  ThreadPreviewProps,
  TimelineFeedProps,
} from "../types.js";

const THEME_KEY_MAP: Record<PostType, keyof ThemeComponents> = {
  note: "NoteCard",
  article: "ArticleCard",
  link: "LinkCard",
  quote: "QuoteCard",
  image: "ImageCard",
  page: "NoteCard",
};

/**
 * Resolves the card component for a given post type.
 *
 * Checks theme overrides first, then falls back to the provided default card component.
 *
 * @param type - The post type to resolve a card for
 * @param defaults - Map of post type to default card component
 * @param themeComponents - Optional theme component overrides
 * @returns The resolved card component
 *
 * @example
 * ```ts
 * const Card = resolveCardComponent("article", DEFAULT_CARD_MAP, c.var.config.theme?.components);
 * ```
 */
export function resolveCardComponent(
  type: PostType,
  defaults: Record<PostType, FC<TimelineCardProps>>,
  themeComponents?: ThemeComponents,
): FC<TimelineCardProps> {
  const key = THEME_KEY_MAP[type];
  const override = themeComponents?.[key] as FC<TimelineCardProps> | undefined;
  return override ?? defaults[type];
}

/**
 * Resolves the ThreadPreview component.
 *
 * @param defaultComponent - The default ThreadPreview component
 * @param themeComponents - Optional theme component overrides
 * @returns The resolved ThreadPreview component
 */
export function resolveThreadPreview(
  defaultComponent: FC<ThreadPreviewProps>,
  themeComponents?: ThemeComponents,
): FC<ThreadPreviewProps> {
  return themeComponents?.ThreadPreview ?? defaultComponent;
}

/**
 * Resolves the TimelineFeed component.
 *
 * @param defaultComponent - The default TimelineFeed component
 * @param themeComponents - Optional theme component overrides
 * @returns The resolved TimelineFeed component
 */
export function resolveTimelineFeed(
  defaultComponent: FC<TimelineFeedProps>,
  themeComponents?: ThemeComponents,
): FC<TimelineFeedProps> {
  return themeComponents?.TimelineFeed ?? defaultComponent;
}
