/**
 * Threads Theme - Timeline Feed
 *
 * Date-grouped posts separated by thin dividers.
 * A centered date header appears above each group.
 *
 * IMPORTANT: The item structure (`<div>` + `<hr class="border-border my-5">`)
 * must match the SSE load-more handler in core's home.tsx so that dynamically
 * loaded items are visually consistent with the initial render.
 */

import type { FC } from "hono/jsx";
import type { TimelineFeedProps, TimelineItemView } from "@jant/core";
import { TimelineItem } from "./TimelineItem.js";
import { ThreadPreview as DefaultThreadPreview } from "./ThreadPreview.js";
import { TimelineLoadMore as DefaultTimelineLoadMore } from "./TimelineLoadMore.js";

interface DateGroup {
  dateKey: string;
  label: string;
  items: TimelineItemView[];
}

/** Groups timeline items by their publication date (YYYY-MM-DD). */
function groupByDate(items: TimelineItemView[]): DateGroup[] {
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

export const TimelineFeed: FC<TimelineFeedProps> = ({
  items,
  hasMore,
  nextCursor,
  theme,
}) => {
  const ResolvedThreadPreview = theme?.ThreadPreview ?? DefaultThreadPreview;
  const ResolvedLoadMore = theme?.TimelineLoadMore ?? DefaultTimelineLoadMore;
  const groups = groupByDate(items);

  return (
    <div>
      <div id="timeline-feed">
        {groups.map((group) => (
          <div key={group.dateKey} class="threads-card">
            <div class="threads-date-header">
              <span>{group.label}</span>
            </div>
            <div id={`date-items-${group.dateKey}`} class="flex flex-col">
              {group.items.map((item, i) => (
                <div key={item.post.id}>
                  {i > 0 && <hr class="border-border my-5" />}
                  {item.threadPreview ? (
                    <ResolvedThreadPreview
                      rootPost={item.post}
                      previewReplies={item.threadPreview.replies}
                      totalReplyCount={item.threadPreview.totalReplyCount}
                      theme={theme}
                    />
                  ) : (
                    <TimelineItem item={item} theme={theme} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {hasMore && nextCursor && (
        <ResolvedLoadMore
          nextCursor={nextCursor}
          lastDate={groups.at(-1)?.dateKey}
          theme={theme}
        />
      )}
    </div>
  );
};
