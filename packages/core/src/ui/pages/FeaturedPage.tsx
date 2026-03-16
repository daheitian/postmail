/**
 * Featured Page
 *
 * Shows featured posts as a timeline feed.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { FeaturedPageProps } from "../../types.js";
import { TimelineFeed } from "../feed/TimelineFeed.js";
import { PaginatedPageHeader } from "../shared/PaginatedPageHeader.js";
import { HomePageBranding } from "../shared/HomePageBranding.js";

export const FeaturedPage: FC<FeaturedPageProps> = ({
  items,
  currentPage,
  totalPages,
  baseUrl,
  showJantBranding = false,
}) => {
  const { t } = useLingui();

  return (
    <div data-page="featured">
      <PaginatedPageHeader
        title={t({
          message: "Featured",
          comment: "@context: Page heading for the featured posts feed",
        })}
        currentPage={currentPage}
        totalPages={totalPages}
        hideOnFirstPage
        showTitle={false}
      />
      <main>
        {items.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message:
                "No featured posts. Mark a post as featured to highlight it here.",
              comment: "@context: Empty state message on featured page",
            })}
          </p>
        ) : (
          <TimelineFeed
            items={items}
            baseUrl={baseUrl}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        )}
        {showJantBranding && <HomePageBranding />}
      </main>
    </div>
  );
};
