/**
 * Minimal Theme - Timeline Load More
 *
 * Text link style load-more button for the minimal theme.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { TimelineLoadMoreProps } from "../../../types.js";

export const TimelineLoadMore: FC<TimelineLoadMoreProps> = ({ nextCursor }) => {
  const { t } = useLingui();

  return (
    <div id="load-more-container" class="mt-8 text-center">
      <button
        class="text-sm text-muted-foreground hover:text-foreground hover:underline"
        data-on:click={`@get('/?cursor=${nextCursor}')`}
      >
        {t({
          message: "Load more",
          comment: "@context: Button to load more posts in timeline",
        })}
      </button>
    </div>
  );
};
