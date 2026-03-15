/**
 * Timeline Feed
 *
 * Flat list of posts separated by lightweight dividers.
 */

import type { FC } from "hono/jsx";
import type { TimelineFeedProps } from "../../types.js";
import { TimelineItem } from "./TimelineItem.js";
import { ThreadPreview } from "./ThreadPreview.js";
import { PagePagination } from "../shared/Pagination.js";

export const TimelineFeed: FC<TimelineFeedProps> = ({
  items,
  baseUrl,
  currentPage,
  totalPages,
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
                  latestReply={item.threadPreview.latestReply}
                  parentReply={item.threadPreview.parentReply}
                  totalReplyCount={item.threadPreview.totalReplyCount}
                />
              ) : (
                <TimelineItem item={item} />
              )}
            </div>
          ))}
        </div>
      </div>
      {currentPage !== undefined &&
        totalPages !== undefined &&
        totalPages > 1 && (
          <PagePagination
            baseUrl={baseUrl}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        )}
    </div>
  );
};
