/**
 * Thread Preview
 *
 * Root post + vertical line connector + compact replies underneath.
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

  return (
    <div>
      <TimelineItem item={{ post: rootPost }} />
      {previewReplies.length > 0 && (
        <div class="feed-replies">
          {previewReplies.map((reply) => (
            <div key={reply.id} class="feed-reply">
              <TimelineItemFromPost post={reply} compact />
            </div>
          ))}
          {remainingCount > 0 && (
            <div class="feed-reply">
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
      )}
    </div>
  );
};
