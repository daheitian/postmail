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
  CardMode,
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
  mode?: CardMode;
}

interface TimelineItemFromPostProps {
  post: PostView;
  mode?: CardMode;
}

export const TimelineItem: FC<TimelineItemProps> = ({ item, mode }) => {
  const Card = CARD_MAP[item.post.format];
  return <Card post={item.post} mode={mode} />;
};

export const TimelineItemFromPost: FC<TimelineItemFromPostProps> = ({
  post,
  mode,
}) => {
  const Card = CARD_MAP[post.format];
  return <Card post={post} mode={mode} />;
};
