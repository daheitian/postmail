/**
 * Minimal Theme - Timeline Feed
 *
 * Date-grouped posts separated by thin dividers.
 * A centered date header appears above each group.
 */

import type { FC } from "hono/jsx";
import type { TimelineFeedProps } from "@jant/core";
import { TimelineItem } from "./TimelineItem.js";
import { ThreadPreview as DefaultThreadPreview } from "./ThreadPreview.js";
import { TimelineLoadMore as DefaultTimelineLoadMore } from "./TimelineLoadMore.js";
import { groupByDate } from "./groupByDate.js";

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
          <div key={group.dateKey}>
            <div class="minimal-date-header">
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
