/**
 * Featured Page
 *
 * Shows featured posts as a timeline feed.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { FeaturedPageProps } from "../../types.js";
import { TimelineFeed } from "../feed/TimelineFeed.js";

export const FeaturedPage: FC<FeaturedPageProps> = ({ items }) => {
  const { t } = useLingui();

  return (
    <div data-page="featured">
      <main>
        {items.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "No featured posts yet.",
              comment: "@context: Empty state message on featured page",
            })}
          </p>
        ) : (
          <TimelineFeed items={items} />
        )}
      </main>
    </div>
  );
};
