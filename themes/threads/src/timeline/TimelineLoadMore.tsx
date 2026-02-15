/**
 * Threads Theme - Timeline Load More
 *
 * Auto-loads more posts when scrolled into view.
 * Passes `lastDate` to the server so it can merge date groups across pages.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { TimelineLoadMoreProps } from "@jant/core";

export const TimelineLoadMore: FC<TimelineLoadMoreProps> = ({
  nextCursor,
  lastDate,
}) => {
  const { t } = useLingui();
  const url = lastDate
    ? `/?cursor=${nextCursor}&lastDate=${lastDate}`
    : `/?cursor=${nextCursor}`;

  return (
    <div
      id="load-more-container"
      class="py-6 text-center"
      data-on-intersect__once={`@get('${url}')`}
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
