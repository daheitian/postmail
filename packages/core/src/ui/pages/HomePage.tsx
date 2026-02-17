/**
 * Home Page
 *
 * Timeline feed with per-type card components and thread previews.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { HomePageProps } from "../../types.js";
import { TimelineFeed } from "../feed/TimelineFeed.js";

export const HomePage: FC<HomePageProps> = ({
  items,
  currentPage,
  totalPages,
}) => {
  const { t } = useLingui();

  return (
    <div data-page="home">
      {items.length === 0 ? (
        <p class="py-12 text-center text-muted-foreground">
          {t({
            message: "No posts yet.",
            comment: "@context: Empty state message on home page",
          })}
        </p>
      ) : (
        <TimelineFeed
          items={items}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};
