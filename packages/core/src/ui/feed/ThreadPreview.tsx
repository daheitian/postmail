/**
 * Thread Preview
 *
 * Flat sibling layout with a continuous vertical line connecting all posts.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { ThreadPreviewProps } from "../../types.js";
import { TimelineItem } from "./TimelineItem.js";
import { TimelineItemFromPost } from "./TimelineItem.js";

export const ThreadPreview: FC<ThreadPreviewProps> = ({
  rootPost,
  previewReplies,
  totalReplyCount,
}) => {
  const { t } = useLingui();
  const remainingCount = totalReplyCount - previewReplies.length;

  // Standalone post: no thread line
  if (previewReplies.length === 0) {
    return <TimelineItem item={{ post: rootPost }} />;
  }

  return (
    <div class="thread-group">
      <div class="thread-item">
        <TimelineItem item={{ post: rootPost }} />
      </div>
      {previewReplies.map((reply) => (
        <div key={reply.id} class="thread-item">
          <TimelineItemFromPost post={reply} compact />
        </div>
      ))}
      {remainingCount > 0 && (
        <div class="thread-item">
          <a
            href={rootPost.permalink}
            class="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            {t({
              message: `Show ${remainingCount} more ${remainingCount === 1 ? "reply" : "replies"}`,
              comment: "@context: Link to show remaining thread replies",
            })}
          </a>
        </div>
      )}
    </div>
  );
};
