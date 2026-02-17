/**
 * Featured Page
 *
 * Shows featured posts as a timeline feed.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { FeaturedPageProps } from "../../types.js";
import { TimelineFeed } from "../feed/TimelineFeed.js";

export const FeaturedPage: FC<FeaturedPageProps> = ({
  items,
  hasMore,
  nextCursor,
}) => {
  const { t } = useLingui();

  return (
    <div class="py-6" data-page="featured">
      <header class="mb-8">
        <h1 class="text-2xl font-semibold">
          {t({
            message: "Featured",
            comment: "@context: Featured page heading",
          })}
        </h1>
      </header>

      <main>
        {items.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "No featured posts yet.",
              comment: "@context: Empty state message on featured page",
            })}
          </p>
        ) : (
          <TimelineFeed
            items={items}
            hasMore={hasMore}
            nextCursor={nextCursor}
          />
        )}
      </main>
    </div>
  );
};
