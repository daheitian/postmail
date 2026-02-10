/**
 * Timeline Feed Component
 *
 * Main feed wrapper with load-more button.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { TimelineFeedProps } from "../../../types.js";
import { TimelineItem } from "./TimelineItem.js";
import { ThreadPreview } from "./ThreadPreview.js";

export const TimelineFeed: FC<TimelineFeedProps> = ({
  items,
  hasMore,
  nextCursor,
}) => {
  const { t } = useLingui();

  return (
    <div>
      <div id="timeline-feed" class="flex flex-col gap-4">
        {items.map((item) => {
          if (item.threadPreview) {
            return (
              <ThreadPreview
                key={item.post.id}
                rootPost={item.post}
                previewReplies={item.threadPreview.replies}
                totalReplyCount={item.threadPreview.totalReplyCount}
              />
            );
          }
          return <TimelineItem key={item.post.id} item={item} />;
        })}
      </div>
      {hasMore && nextCursor && (
        <div id="load-more-container" class="mt-6 text-center">
          <button
            class="btn btn-outline"
            data-on:click={`@get('/api/timeline?cursor=${nextCursor}')`}
          >
            {t({
              message: "Load more",
              comment: "@context: Button to load more posts in timeline",
            })}
          </button>
        </div>
      )}
    </div>
  );
};
