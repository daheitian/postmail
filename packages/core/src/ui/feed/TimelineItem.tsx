/**
 * Timeline Item
 *
 * Dispatches to the correct card component based on post format.
 */

import type { FC } from "hono/jsx";
import type {
  TimelineItemView,
  TimelineCardProps,
  PostView,
  Format,
} from "../../types.js";
import { NoteCard } from "./NoteCard.js";
import { LinkCard } from "./LinkCard.js";
import { QuoteCard } from "./QuoteCard.js";

const CARD_MAP: Record<Format, FC<TimelineCardProps>> = {
  note: NoteCard,
  link: LinkCard,
  quote: QuoteCard,
};

interface TimelineItemProps {
  item: TimelineItemView;
  compact?: boolean;
}

interface TimelineItemFromPostProps {
  post: PostView;
  compact?: boolean;
}

export const TimelineItem: FC<TimelineItemProps> = ({ item, compact }) => {
  const Card = CARD_MAP[item.post.format];
  return <Card post={item.post} compact={compact} />;
};

export const TimelineItemFromPost: FC<TimelineItemFromPostProps> = ({
  post,
  compact,
}) => {
  const Card = CARD_MAP[post.format];
  return <Card post={post} compact={compact} />;
};
