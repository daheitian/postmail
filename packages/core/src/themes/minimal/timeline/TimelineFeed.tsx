/**
 * Minimal Theme - Timeline Feed
 *
 * Divider-separated stream of posts with load-more button.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { TimelineFeedProps } from "../../../types.js";
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
      <div id="timeline-feed" class="flex flex-col">
        {items.map((item, i) => (
          <div key={item.post.id}>
            {i > 0 && <hr class="my-6 border-border" />}
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
      {hasMore && nextCursor && (
        <div id="load-more-container" class="mt-8 text-center">
          <button
            class="text-sm text-muted-foreground hover:text-foreground hover:underline"
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
