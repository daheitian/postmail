/**
 * Timeline Item Component
 *
 * Dispatches to the correct card component based on post type.
 */

import type { FC } from "hono/jsx";
import type { TimelineItemData, TimelineCardProps } from "../../../types.js";
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

interface TimelineItemProps {
  item: TimelineItemData;
  compact?: boolean;
  /** Override card component (for theme overrides) */
  cardOverride?: FC<TimelineCardProps>;
}

export const TimelineItem: FC<TimelineItemProps> = ({
  item,
  compact,
  cardOverride,
}) => {
  const Card = cardOverride ?? CARD_MAP[item.post.type];
  return <Card post={item.post} compact={compact} />;
};
