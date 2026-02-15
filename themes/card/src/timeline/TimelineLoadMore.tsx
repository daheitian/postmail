/**
 * Card Theme - Timeline Load More
 *
 * Outlined button style load-more for the card theme.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { TimelineLoadMoreProps } from "@jant/core";

export const TimelineLoadMore: FC<TimelineLoadMoreProps> = ({ nextCursor }) => {
  const { t } = useLingui();

  return (
    <div id="load-more-container" class="mt-6 text-center">
      <button class="btn" data-on:click={`@get('/?cursor=${nextCursor}')`}>
        {t({
          message: "Load more",
          comment: "@context: Button to load more posts in timeline",
        })}
      </button>
    </div>
  );
};
