/**
 * Thread Preview Component
 *
 * Inline thread preview: root card + compact replies + "show more" link.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { ThreadPreviewProps } from "../../../types.js";
import { TimelineItem } from "./TimelineItem.js";
import * as sqid from "../../../lib/sqid.js";

export const ThreadPreview: FC<ThreadPreviewProps> = ({
  rootPost,
  previewReplies,
  totalReplyCount,
  theme,
}) => {
  const { t } = useLingui();
  const permalink = `/p/${sqid.encode(rootPost.id)}`;
  const remainingCount = totalReplyCount - previewReplies.length;

  return (
    <div class="timeline-thread">
      <TimelineItem item={{ post: rootPost }} theme={theme} />
      {previewReplies.length > 0 && (
        <div class="timeline-thread-replies">
          {previewReplies.map((reply) => (
            <div key={reply.id} class="timeline-thread-reply">
              <TimelineItem item={{ post: reply }} compact theme={theme} />
            </div>
          ))}
          {remainingCount > 0 && (
            <div class="timeline-thread-reply">
              <a
                href={permalink}
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
