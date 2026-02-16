/**
 * Groups timeline items by their publication date (YYYY-MM-DD).
 *
 * Shared between TimelineFeed (initial render) and timelineMore (SSE patches)
 * so that both produce identical date group structure.
 */

import type { TimelineItemView, DateGroup } from "@jant/core";

export function groupByDate(items: TimelineItemView[]): DateGroup[] {
  const groups: DateGroup[] = [];
  let current: DateGroup | null = null;

  for (const item of items) {
    const dateKey = item.post.publishedAt.slice(0, 10);
    if (!current || current.dateKey !== dateKey) {
      current = { dateKey, label: item.post.publishedAtFormatted, items: [] };
      groups.push(current);
    }
    current.items.push(item);
  }

  return groups;
}
