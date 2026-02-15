/**
 * Threads Theme - Thread Preview
 *
 * Root post + vertical line connector + compact replies underneath.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { ThreadPreviewProps } from "@jant/core";
import { TimelineItem } from "./TimelineItem.js";
import { TimelineItemFromPost } from "./TimelineItem.js";

export const ThreadPreview: FC<ThreadPreviewProps> = ({
  rootPost,
  previewReplies,
  totalReplyCount,
  theme,
}) => {
  const { t } = useLingui();
  const remainingCount = totalReplyCount - previewReplies.length;

  return (
    <div>
      <TimelineItem item={{ post: rootPost }} theme={theme} />
      {previewReplies.length > 0 && (
        <div class="threads-replies">
          {previewReplies.map((reply) => (
            <div key={reply.id} class="threads-reply">
              <TimelineItemFromPost post={reply} compact theme={theme} />
            </div>
          ))}
          {remainingCount > 0 && (
            <div class="threads-reply">
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
