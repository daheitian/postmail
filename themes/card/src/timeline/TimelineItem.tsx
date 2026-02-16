/**
 * Card Theme - Timeline Item
 *
 * Dispatches to the correct card component based on post format.
 */

import type { FC } from "hono/jsx";
import type {
  TimelineItemView,
  TimelineCardProps,
  ThemeComponents,
  PostView,
  Format,
} from "@jant/core";
import { NoteCard } from "./NoteCard.js";
import { LinkCard } from "./LinkCard.js";
import { QuoteCard } from "./QuoteCard.js";

const CARD_MAP: Record<Format, FC<TimelineCardProps>> = {
  note: NoteCard,
  link: LinkCard,
  quote: QuoteCard,
};

const THEME_KEY_MAP: Record<Format, keyof ThemeComponents> = {
  note: "NoteCard",
  link: "LinkCard",
  quote: "QuoteCard",
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
  const themeKey = THEME_KEY_MAP[item.post.format];
  const themeCard = theme?.[themeKey] as FC<TimelineCardProps> | undefined;
  const Card = cardOverride ?? themeCard ?? CARD_MAP[item.post.format];
  return <Card post={item.post} compact={compact} />;
};

export const TimelineItemFromPost: FC<TimelineItemFromPostProps> = ({
  post,
  compact,
  cardOverride,
  theme,
}) => {
  const themeKey = THEME_KEY_MAP[post.format];
  const themeCard = theme?.[themeKey] as FC<TimelineCardProps> | undefined;
  const Card = cardOverride ?? themeCard ?? CARD_MAP[post.format];
  return <Card post={post} compact={compact} />;
};
