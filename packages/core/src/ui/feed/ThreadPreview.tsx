/**
 * Thread Preview
 *
 * Shows latest reply as the hero post with faded ancestor context above.
 * Thread line connects all posts via `.thread-group` / `.thread-item`.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { ThreadPreviewProps } from "../../types.js";
import { TimelineItem } from "./TimelineItem.js";
import { TimelineItemFromPost } from "./TimelineItem.js";

export const ThreadPreview: FC<ThreadPreviewProps> = ({
  rootPost,
  latestReply,
  parentReply,
  totalReplyCount,
}) => {
  const { t } = useLingui();

  // Count of posts between root and parent (or root and latest if no parent)
  const hiddenCount = parentReply
    ? totalReplyCount - 2 // exclude latest + parent
    : totalReplyCount - 1; // exclude latest only

  return (
    <div class="thread-group">
      {/* Faded ancestor context */}
      <div class="thread-context-faded" data-thread-context>
        {/* Root post (compact) */}
        <div class="thread-item">
          <TimelineItemFromPost post={rootPost} compact />
        </div>

        {/* Hidden posts gap */}
        {hiddenCount > 0 && (
          <div class="thread-item">
            <a
              href={latestReply.permalink}
              class="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {t({
                message: `${hiddenCount} more ${hiddenCount === 1 ? "post" : "posts"}`,
                comment:
                  "@context: Link showing count of hidden thread posts between root and latest",
              })}
            </a>
          </div>
        )}

        {/* Parent of latest reply (compact) */}
        {parentReply && (
          <div class="thread-item">
            <TimelineItemFromPost post={parentReply} compact />
          </div>
        )}

        {/* Gradient fade overlay */}
        <div class="thread-context-fade" />
      </div>

      {/* Toggle button */}
      <button
        type="button"
        class="thread-context-toggle text-xs text-muted-foreground hover:text-foreground"
        data-thread-context-toggle
      >
        {t({
          message: "Show more",
          comment: "@context: Button to expand faded thread context",
        })}
      </button>

      {/* Latest reply (full card, hero) */}
      <div class="thread-item">
        <TimelineItem item={{ post: latestReply }} />
      </div>
    </div>
  );
};
