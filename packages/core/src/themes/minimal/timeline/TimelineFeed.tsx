/**
 * Minimal Theme - Timeline Feed
 *
 * Date-grouped stream of posts with load-more button.
 * Posts are grouped by publication date, with each group showing
 * a date header and items displaying only the time.
 */

import type { FC } from "hono/jsx";
import type { TimelineFeedProps, TimelineItemView } from "../../../types.js";
import { TimelineItem } from "./TimelineItem.js";
import { ThreadPreview as DefaultThreadPreview } from "./ThreadPreview.js";
import { TimelineLoadMore as DefaultTimelineLoadMore } from "./TimelineLoadMore.js";

interface DateGroup {
  dateKey: string;
  label: string;
  items: TimelineItemView[];
}

/**
 * Groups timeline items by their publication date (YYYY-MM-DD).
 */
function groupByDate(items: TimelineItemView[]): DateGroup[] {
  const groups: DateGroup[] = [];
  let current: DateGroup | null = null;

  for (const item of items) {
    const dateKey = item.post.publishedAt.slice(0, 10);
    if (!current || current.dateKey !== dateKey) {
      current = {
        dateKey,
        label: item.post.publishedAtFormatted,
        items: [],
      };
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
        {groups.map((group, groupIndex) => (
          <div key={group.dateKey}>
            {groupIndex > 0 && <div class="mt-2 mb-6 h-px bg-border" />}
            <div>
              <time
                class="block text-sm font-semibold text-foreground mb-4"
                datetime={group.dateKey}
              >
                {group.label}
              </time>
              <div
                id={`date-items-${group.dateKey}`}
                class="flex flex-col gap-5"
              >
                {group.items.map((item) => (
                  <div key={item.post.id}>
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
