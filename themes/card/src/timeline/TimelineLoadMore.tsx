/**
 * Card Theme - Timeline Load More
 *
 * Auto-loads more posts when scrolled into view using intersection observer.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { TimelineLoadMoreProps } from "@jant/core";

export const TimelineLoadMore: FC<TimelineLoadMoreProps> = ({ nextCursor }) => {
  const { t } = useLingui();

  return (
    <div
      id="load-more-container"
      class="mt-6 text-center"
      data-on-intersect__once={`@get('/?cursor=${nextCursor}')`}
    >
      <span class="text-sm text-muted-foreground">
        {t({
          message: "Loading...",
          comment: "@context: Loading indicator while fetching more posts",
        })}
      </span>
    </div>
  );
};
