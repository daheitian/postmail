/**
 * Minimal Theme - Home Page
 *
 * Renders the timeline feed with thread previews.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { HomePageProps } from "../../../types.js";
import { TimelineFeed as DefaultTimelineFeed } from "../timeline/TimelineFeed.js";

export const HomePage: FC<HomePageProps> = ({
  items,
  hasMore,
  nextCursor,
  theme,
}) => {
  const { t } = useLingui();

  const Feed = theme?.TimelineFeed ?? DefaultTimelineFeed;

  return (
    <>
      {items.length === 0 ? (
        <p class="text-muted-foreground">
          {t({
            message: "No posts yet.",
            comment: "@context: Empty state message on home page",
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
    </>
  );
};
