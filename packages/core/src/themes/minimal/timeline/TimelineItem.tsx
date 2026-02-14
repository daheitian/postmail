/**
 * Minimal Theme - Timeline Item
 *
 * Dispatches to the correct card component based on post type.
 */

import type { FC } from "hono/jsx";
import type {
  TimelineItemView,
  TimelineCardProps,
  ThemeComponents,
  PostView,
} from "../../../types.js";
import { NoteCard } from "./NoteCard.js";
import { ArticleCard } from "./ArticleCard.js";
import { LinkCard } from "./LinkCard.js";
import { QuoteCard } from "./QuoteCard.js";
import { ImageCard } from "./ImageCard.js";
import type { PostType } from "../../../types.js";

const CARD_MAP: Record<PostType, FC<TimelineCardProps>> = {
  note: NoteCard,
  article: ArticleCard,
  link: LinkCard,
  quote: QuoteCard,
  image: ImageCard,
  page: NoteCard,
};

const THEME_KEY_MAP: Record<PostType, keyof ThemeComponents> = {
  note: "NoteCard",
  article: "ArticleCard",
  link: "LinkCard",
  quote: "QuoteCard",
  image: "ImageCard",
  page: "NoteCard",
};

interface TimelineItemProps {
  item: TimelineItemView;
  compact?: boolean;
  cardOverride?: FC<TimelineCardProps>;
  theme?: ThemeComponents;
}

interface TimelineItemFromPostProps {
  post: PostView;
  compact?: boolean;
  cardOverride?: FC<TimelineCardProps>;
  theme?: ThemeComponents;
}

export const TimelineItem: FC<TimelineItemProps> = ({
  item,
  compact,
  cardOverride,
  theme,
}) => {
  const themeKey = THEME_KEY_MAP[item.post.type];
  const themeCard = theme?.[themeKey] as FC<TimelineCardProps> | undefined;
  const Card = cardOverride ?? themeCard ?? CARD_MAP[item.post.type];
  return <Card post={item.post} compact={compact} />;
};

export const TimelineItemFromPost: FC<TimelineItemFromPostProps> = ({
  post,
  compact,
  cardOverride,
  theme,
}) => {
  const themeKey = THEME_KEY_MAP[post.type];
  const themeCard = theme?.[themeKey] as FC<TimelineCardProps> | undefined;
  const Card = cardOverride ?? themeCard ?? CARD_MAP[post.type];
  return <Card post={post} compact={compact} />;
};
