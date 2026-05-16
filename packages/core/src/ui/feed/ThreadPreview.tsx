/**
 * Thread Preview
 *
 * Shows latest reply as the hero post with collapsible faded ancestor context above.
 * Thread line connects all posts via `.thread-group` / `.thread-item`.
 */

import { msg } from "@lingui/core/macro";
import type { FC } from "hono/jsx";
import { useLingui } from "../../i18n/context.js";
import type { ThreadPreviewProps } from "../../types.js";
import { TimelineItem } from "./TimelineItem.js";
import { TimelineItemFromPost } from "./TimelineItem.js";
import { getThreadPreviewState } from "./thread-preview-state.js";

const ROOT_CONTEXT_DISPLAY = {
  footer: {
    hideReply: true,
  },
} as const;

const CONTEXT_DISPLAY = {
  hideRating: true,
  footer: {
    hideReply: true,
  },
} as const;

const HERO_DISPLAY = {} as const;

export const ThreadPreview: FC<ThreadPreviewProps> = ({
  rootPost,
  secondReply,
  penultimateReply,
  latestReply,
  totalReplyCount,
}) => {
  const { i18n } = useLingui();
  const { hiddenCount } = getThreadPreviewState({
    secondReply,
    penultimateReply,
    latestReply,
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
  const showMoreLabel = i18n._(
    msg({
      message: "Show more",
      comment: "@context: Expand faded thread ancestor context in the feed",
    }),
  );
  const showLessLabel = i18n._(
    msg({
      message: "Show less",
      comment:
        "@context: Collapse expanded thread ancestor context in the feed",
    }),
  );
  const renderedSecondReply =
    secondReply && secondReply.id !== latestReply.id ? secondReply : undefined;
  const renderedPenultimateReply =
    penultimateReply &&
    penultimateReply.id !== latestReply.id &&
    penultimateReply.id !== secondReply?.id
      ? penultimateReply
      : undefined;
  const gapHref = renderedSecondReply?.permalink ?? latestReply.permalink;

  // Always render the collapsible shell for thread previews. Structural
  // signals (how many ancestor posts exist) aren't a reliable proxy for
  // visual height — a single long root article will push the hero far
  // off-screen just as much as several short replies would. The server
  // assumes overflow (the common case) and renders the cap + fade + toggle
  // immediately; client-side measurement removes the affordance when the
  // content actually fits inside the cap, so users never see a no-op
  // "Show more" button.

  const rootItem = (
    <div class="thread-item thread-item-context">
      <TimelineItemFromPost
        post={rootPost}
        mode="feed"
        display={ROOT_CONTEXT_DISPLAY}
      />
    </div>
  );

  const secondReplyItem = renderedSecondReply ? (
    <div class="thread-item thread-item-context">
      <TimelineItemFromPost
        post={renderedSecondReply}
        mode="feed"
        display={CONTEXT_DISPLAY}
      />
    </div>
  ) : null;

  const gapItem =
    hiddenCount > 0 ? (
      <div class="thread-item thread-item-gap">
        <a href={gapHref} class="thread-gap-link">
          {hiddenPostsLabel}
        </a>
      </div>
    ) : null;

  const penultimateItem = renderedPenultimateReply ? (
    <div class="thread-item thread-item-context">
      <TimelineItemFromPost
        post={renderedPenultimateReply}
        mode="feed"
        display={CONTEXT_DISPLAY}
      />
    </div>
  ) : null;

  return (
    <div class="thread-group thread-group-preview">
      <div class="thread-context-shell" data-thread-context data-collapsed="">
        {rootItem}
        {secondReplyItem}
        {gapItem}
        {penultimateItem}
        <div class="thread-context-fade" aria-hidden="true" />
      </div>
      <button
        type="button"
        class="thread-context-toggle"
        data-thread-context-toggle
        data-label-more={showMoreLabel}
        data-label-less={showLessLabel}
        aria-expanded="false"
      >
        <span class="thread-context-toggle-label">{showMoreLabel}</span>
        <svg
          class="thread-context-toggle-chevron"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      {/* Latest reply (full card, hero) */}
      <div class="thread-item thread-item-hero">
        <TimelineItem item={{ post: latestReply }} display={HERO_DISPLAY} />
      </div>
    </div>
  );
};
