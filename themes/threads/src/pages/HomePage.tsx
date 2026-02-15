/**
 * Threads Theme - Home Page
 *
 * Clean feed of posts separated by dividers.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { HomePageProps } from "@jant/core";
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
        <p class="py-12 text-center text-muted-foreground">
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
