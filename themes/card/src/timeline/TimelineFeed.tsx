/**
 * Card Theme - Timeline Feed
 *
 * Main feed wrapper with gap-separated cards and load-more button.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { TimelineFeedProps } from "@jant/core";
import { TimelineItem } from "./TimelineItem.js";
import { ThreadPreview as DefaultThreadPreview } from "./ThreadPreview.js";

export const TimelineFeed: FC<TimelineFeedProps> = ({
  items,
  hasMore,
  nextCursor,
  theme,
}) => {
  const { t } = useLingui();

  const ResolvedThreadPreview = theme?.ThreadPreview ?? DefaultThreadPreview;

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
