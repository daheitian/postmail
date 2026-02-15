/**
 * Minimal Theme - Timeline Feed
 *
 * Date-grouped stream of posts with load-more button.
 * Posts are grouped by publication date, with each group showing
 * a date header and items displaying only the time.
 */

import type { FC } from "hono/jsx";
import type { TimelineFeedProps } from "../../../types.js";
import { groupByDate } from "../../../lib/timeline.js";
import { TimelineItem } from "./TimelineItem.js";
import { ThreadPreview as DefaultThreadPreview } from "./ThreadPreview.js";
import { TimelineLoadMore as DefaultTimelineLoadMore } from "./TimelineLoadMore.js";

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
            <div
              class={`flex items-center gap-4 ${groupIndex === 0 ? "mb-5" : "my-5"}`}
            >
              <div class="h-px flex-1 bg-border" />
              <time
                class="text-xs text-muted-foreground shrink-0"
                datetime={group.dateKey}
              >
                {group.label}
              </time>
              <div class="h-px flex-1 bg-border" />
            </div>
            <div id={`date-items-${group.dateKey}`} class="flex flex-col">
              {group.items.map((item, itemIndex) => (
                <div key={item.post.id}>
                  {itemIndex > 0 && <hr class="border-border my-5" />}
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
