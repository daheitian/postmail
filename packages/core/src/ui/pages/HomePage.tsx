/**
 * Home Page
 *
 * Timeline feed with per-type card components and thread previews.
 */

import { msg } from "@lingui/core/macro";
import type { FC } from "hono/jsx";
import { useLingui } from "../../i18n/context.js";
import type { HomePageProps } from "../../types.js";
import { TimelineFeed } from "../feed/TimelineFeed.js";
import { PaginatedPageHeader } from "../shared/PaginatedPageHeader.js";

export const HomePage: FC<HomePageProps> = ({
  items,
  baseUrl,
  currentPage,
  totalPages,
}) => {
  const { i18n } = useLingui();

  return (
    <div data-page="home">
      <PaginatedPageHeader
        title={i18n._(
          msg({
            message: "Latest",
            comment: "@context: Page heading for the latest posts feed",
          }),
        )}
        currentPage={currentPage}
        totalPages={totalPages}
        hideOnFirstPage
        showTitle={false}
      />
      {items.length === 0 ? (
        <div data-feed>
          <div id="timeline-feed">
            <div id="timeline-items" class="flex flex-col">
              <p
                id="empty-timeline"
                class="py-12 text-center text-muted-foreground"
              >
                {i18n._(
                  msg({
                    message: "Nothing here yet.",
                    comment: "@context: Empty state message on home page",
                  }),
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <TimelineFeed
          items={items}
          baseUrl={baseUrl}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};
