/**
 * Minimal Theme - Featured Page
 *
 * Shows featured posts as a timeline feed.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { FeaturedPageProps } from "@jant/core";
import { TimelineFeed as DefaultTimelineFeed } from "../timeline/TimelineFeed.js";

export const FeaturedPage: FC<FeaturedPageProps> = ({
  items,
  hasMore,
  nextCursor,
  theme,
}) => {
  const { t } = useLingui();

  const Feed = theme?.TimelineFeed ?? DefaultTimelineFeed;

  return (
    <div class="py-6">
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
          <Feed
            items={items}
            hasMore={hasMore}
            nextCursor={nextCursor}
            theme={theme}
          />
        )}
      </main>
    </div>
  );
};
