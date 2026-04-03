/**
 * Thread Preview
 *
 * Shows latest reply as the hero post with faded ancestor context above.
 * Thread line connects all posts via `.thread-group` / `.thread-item`.
 */

import { msg } from "@lingui/core/macro";
import type { FC } from "hono/jsx";
import { useLingui } from "../../i18n/context.js";
import type { ThreadPreviewProps } from "../../types.js";
import { TimelineItem } from "./TimelineItem.js";
import { TimelineItemFromPost } from "./TimelineItem.js";
import {
  getThreadPreviewState,
  isThreadContextLikelyOverflow,
} from "./thread-preview-state.js";

const ROOT_CONTEXT_DISPLAY = {
  hideRating: true,
  footer: {
    hideReply: true,
  },
} as const;

const PARENT_CONTEXT_DISPLAY = {
  hideRating: true,
  footer: {
    hideReply: true,
  },
} as const;

export const ThreadPreview: FC<ThreadPreviewProps> = ({
  rootPost,
  latestReply,
  parentReply,
  totalReplyCount,
}) => {
  const { i18n } = useLingui();
  const showMoreLabel = i18n._(
    msg({
      message: "Show more",
      comment: "@context: Button to expand faded thread context",
    }),
  );
  const showLessLabel = i18n._(
    msg({
      message: "Show less",
      comment: "@context: Button to collapse expanded thread context",
    }),
  );
  const { hiddenCount } = getThreadPreviewState({
    hasParentReply: parentReply !== undefined,
    totalReplyCount,
  });
  const hiddenPostsLabel = i18n._(
    msg({
      message: "{count, plural, one {# more post} other {# more posts}}",
      comment:
        "@context: Link showing count of hidden thread posts between root and latest",
    }),
    {
      count: hiddenCount,
    },
  );
  const startsCollapsedWithAffordances = isThreadContextLikelyOverflow({
    rootPost,
    parentReply,
    hiddenCount,
  });

  return (
    <div class="thread-group thread-group-preview">
      {/* Faded ancestor context */}
      <div
        class={`thread-context-shell thread-context-collapsed${startsCollapsedWithAffordances ? " thread-context-faded" : ""}`}
        data-thread-context
      >
        {/* Root post */}
        <div class="thread-item thread-item-context">
          <TimelineItemFromPost
            post={rootPost}
            mode="feed"
            display={ROOT_CONTEXT_DISPLAY}
          />
        </div>

        {/* Hidden posts gap */}
        {hiddenCount > 0 && (
          <div class="thread-item thread-item-gap">
            <a href={latestReply.permalink} class="thread-gap-link">
              {hiddenPostsLabel}
            </a>
          </div>
        )}

        {/* Parent of latest reply */}
        {parentReply && (
          <div class="thread-item thread-item-context">
            <TimelineItemFromPost
              post={parentReply}
              mode="feed"
              display={PARENT_CONTEXT_DISPLAY}
            />
          </div>
        )}

        <div class="thread-context-fade" />
      </div>

      {/* Toggle button */}
      <button
        type="button"
        class={`thread-context-toggle text-muted-foreground hover:text-foreground${startsCollapsedWithAffordances ? "" : " hidden"}`}
        data-thread-context-toggle
        data-label-more={showMoreLabel}
        data-label-less={showLessLabel}
        aria-expanded="false"
      >
        {showMoreLabel}
      </button>

      {/* Latest reply (full card, hero) */}
      <div class="thread-item thread-item-hero">
        <TimelineItem item={{ post: latestReply }} />
      </div>
    </div>
  );
};
