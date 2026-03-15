/**
 * Collection Page
 *
 * Collection header with icon and timeline feed of posts.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionPageProps } from "../../types.js";
import { renderCollectionIcon } from "../../lib/icons.js";
import { TimelineFeed } from "../feed/TimelineFeed.js";
import { PaginatedPageHeader } from "../shared/PaginatedPageHeader.js";

export const CollectionPage: FC<CollectionPageProps> = ({
  collection,
  items,
  currentPage,
  totalPages,
  baseUrl,
}) => {
  const { t } = useLingui();
  const iconHtml = renderCollectionIcon(collection.icon, { size: 28 });

  return (
    <div class="py-6" data-page="collection">
      <PaginatedPageHeader
        title={collection.title}
        currentPage={currentPage}
        totalPages={totalPages}
        description={collection.description ?? undefined}
        iconHtml={iconHtml || undefined}
      />

      <main>
        {items.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "This collection is empty. Add posts from the editor.",
              comment: "@context: Empty state message",
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
      </main>
    </div>
  );
};
