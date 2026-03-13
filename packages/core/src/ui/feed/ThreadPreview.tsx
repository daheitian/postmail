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
import { getThreadPreviewState } from "./thread-preview-state.js";

export const ThreadPreview: FC<ThreadPreviewProps> = ({
  rootPost,
  latestReply,
  parentReply,
  totalReplyCount,
}) => {
  const { t } = useLingui();
  const { hiddenCount, shouldShowToggle } = getThreadPreviewState({
    hasParentReply: parentReply !== undefined,
    totalReplyCount,
  });

  return (
    <div class="thread-group thread-group-preview">
      {/* Faded ancestor context */}
      <div
        class={`thread-context-shell${shouldShowToggle ? " thread-context-faded" : ""}`}
        data-thread-context
      >
        {/* Root post (compact) */}
        <div class="thread-item thread-item-context">
          <TimelineItemFromPost post={rootPost} mode="compact" />
        </div>

        {/* Hidden posts gap */}
        {hiddenCount > 0 && (
          <div class="thread-item thread-item-gap">
            <a href={latestReply.permalink} class="thread-gap-link">
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
          <div class="thread-item thread-item-context">
            <TimelineItemFromPost post={parentReply} mode="compact" />
          </div>
        )}

        {/* Gradient fade overlay */}
        {shouldShowToggle && <div class="thread-context-fade" />}
      </div>

      {/* Toggle button */}
      {shouldShowToggle && (
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
      )}

      {/* Latest reply (full card, hero) */}
      <div class="thread-item thread-item-hero">
        <TimelineItem item={{ post: latestReply }} />
      </div>
    </div>
  );
};
