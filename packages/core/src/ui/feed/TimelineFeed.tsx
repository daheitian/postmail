/**
 * Timeline Feed
 *
 * Flat list of posts separated by simple dividers.
 */

import type { FC } from "hono/jsx";
import type { TimelineFeedProps } from "../../types.js";
import { TimelineItem } from "./TimelineItem.js";
import { ThreadPreview } from "./ThreadPreview.js";
import { TimelineLoadMore } from "./TimelineLoadMore.js";

export const TimelineFeed: FC<TimelineFeedProps> = ({
  items,
  hasMore,
  nextCursor,
}) => {
  return (
    <div data-feed>
      <div id="timeline-feed">
        <div id="timeline-items" class="flex flex-col">
          {items.map((item, i) => (
            <div key={item.post.id}>
              {i > 0 && <hr class="feed-divider" />}
              {item.threadPreview ? (
                <ThreadPreview
                  rootPost={item.post}
                  previewReplies={item.threadPreview.replies}
                  totalReplyCount={item.threadPreview.totalReplyCount}
                />
              ) : (
                <TimelineItem item={item} />
              )}
            </div>
          ))}
        </div>
      </div>
      {hasMore && nextCursor && <TimelineLoadMore nextCursor={nextCursor} />}
    </div>
  );
};
