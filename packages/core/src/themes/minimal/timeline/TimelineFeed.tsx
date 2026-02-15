/**
 * Minimal Theme - Timeline Feed
 *
 * Divider-separated stream of posts with load-more button.
 */

import type { FC } from "hono/jsx";
import type { TimelineFeedProps } from "../../../types.js";
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
      <div id="timeline-feed">
        {items.map((item, index) => (
          <div key={item.post.id}>
            {index > 0 && <hr class="border-border" />}
            <div class="py-6">
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
          </div>
        ))}
      </div>
      {hasMore && nextCursor && (
        <ResolvedLoadMore nextCursor={nextCursor} theme={theme} />
      )}
    </div>
  );
};
