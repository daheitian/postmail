/**
 * Home Page
 *
 * Timeline feed with per-type card components and thread previews.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { HomePageProps } from "../../types.js";
import { TimelineFeed } from "../feed/TimelineFeed.js";
import { PaginatedPageHeader } from "../shared/PaginatedPageHeader.js";
import { HomePageBranding } from "../shared/HomePageBranding.js";

export const HomePage: FC<HomePageProps> = ({
  items,
  baseUrl,
  currentPage,
  totalPages,
  showJantBranding = false,
}) => {
  const { t } = useLingui();

  return (
    <div data-page="home">
      <PaginatedPageHeader
        title={t({
          message: "Latest",
          comment: "@context: Page heading for the latest posts feed",
        })}
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
                {t({
                  message: "Nothing here yet.",
                  comment: "@context: Empty state message on home page",
                })}
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
      {showJantBranding && <HomePageBranding />}
    </div>
  );
};
