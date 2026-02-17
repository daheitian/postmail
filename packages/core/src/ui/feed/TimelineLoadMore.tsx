/**
 * Timeline Load More
 *
 * Auto-loads more posts when scrolled into view.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { TimelineLoadMoreProps } from "../../types.js";

export const TimelineLoadMore: FC<TimelineLoadMoreProps> = ({ nextCursor }) => {
  const { t } = useLingui();
  const url = `/?cursor=${nextCursor}`;

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
