/**
 * Minimal Theme - Thread Preview
 *
 * Minimal thread indicator: root post + compact replies + "show more" link.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { ThreadPreviewProps } from "../../../types.js";
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
        <div class="ml-4 mt-2 border-l border-border pl-4 flex flex-col gap-3">
          {previewReplies.map((reply) => (
            <div key={reply.id}>
              <TimelineItemFromPost post={reply} compact theme={theme} />
            </div>
          ))}
          {remainingCount > 0 && (
            <a
              href={rootPost.permalink}
              class="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {t({
                message: `Show ${remainingCount} more ${remainingCount === 1 ? "reply" : "replies"}`,
                comment: "@context: Link to show remaining thread replies",
              })}
            </a>
          )}
        </div>
      )}
    </div>
  );
};
