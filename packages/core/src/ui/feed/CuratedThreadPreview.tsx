import { msg } from "@lingui/core/macro";
import type { FC } from "hono/jsx";
import { useLingui } from "../../i18n/context.js";
import type { TimelineItemView } from "../../types.js";
import { TimelineItem, TimelineItemFromPost } from "./TimelineItem.js";

const THREAD_CONTEXT_DISPLAY = {
  hideRating: true,
  footer: {
    hideReply: true,
  },
} as const;

const CURATED_SEGMENT_DISPLAY = {} as const;

interface CuratedThreadPreviewProps {
  curatedThread: NonNullable<TimelineItemView["curatedThread"]>;
}

export const CuratedThreadPreview: FC<CuratedThreadPreviewProps> = ({
  curatedThread,
}) => {
  const { i18n } = useLingui();
  const { segments } = curatedThread;

  if (segments.length === 0) {
    return null;
  }

  return (
    <div class="thread-group thread-group-preview thread-group-curated">
      {segments.map((segment) => [
        segment.hiddenBeforeCount > 0 ? (
          <div
            key={`gap-${segment.post.id}`}
            class="thread-item thread-item-gap"
          >
            <a href={segment.post.permalink} class="thread-gap-link">
              {i18n._(
                msg({
                  message:
                    "{count, plural, one {# hidden post} other {# hidden posts}}",
                  comment:
                    "@context: Link showing count of hidden thread posts between curated posts",
                }),
                {
                  count: segment.hiddenBeforeCount,
                },
              )}
            </a>
          </div>
        ) : null,
        <div
          key={`post-${segment.post.id}`}
          class={`thread-item ${
            segment.highlighted ? "thread-item-curated" : "thread-item-context"
          }`}
        >
          {segment.highlighted ? (
            <TimelineItem
              item={{ post: segment.post }}
              display={CURATED_SEGMENT_DISPLAY}
            />
          ) : (
            <TimelineItemFromPost
              post={segment.post}
              mode="feed"
              display={THREAD_CONTEXT_DISPLAY}
            />
          )}
        </div>,
      ])}
    </div>
  );
};
