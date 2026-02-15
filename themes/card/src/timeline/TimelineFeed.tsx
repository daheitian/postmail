/**
 * Card Theme - Timeline Feed
 *
 * Main feed wrapper with gap-separated cards and load-more button.
 */

import type { FC } from "hono/jsx";
import type { TimelineFeedProps } from "@jant/core";
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

  return (
    <div>
      <div id="timeline-feed" class="flex flex-col gap-4">
        {items.map((item) => {
          if (item.threadPreview) {
            return (
              <ResolvedThreadPreview
                key={item.post.id}
                rootPost={item.post}
                previewReplies={item.threadPreview.replies}
                totalReplyCount={item.threadPreview.totalReplyCount}
                theme={theme}
              />
            );
          }
          return <TimelineItem key={item.post.id} item={item} theme={theme} />;
        })}
      </div>
      {hasMore && nextCursor && (
        <ResolvedLoadMore nextCursor={nextCursor} theme={theme} />
      )}
    </div>
  );
};
