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

export const CollectionPage: FC<CollectionPageProps> = ({
  collection,
  items,
}) => {
  const { t } = useLingui();
  const iconHtml = renderCollectionIcon(collection.icon, { size: 28 });

  return (
    <div class="py-6" data-page="collection">
      <header class="mb-8">
        <h1 class="text-2xl font-semibold flex items-center gap-3">
          {iconHtml && (
            <span
              class="shrink-0"
              dangerouslySetInnerHTML={{ __html: iconHtml }}
            />
          )}
          {collection.title}
        </h1>
        {collection.description && (
          <p class="text-muted-foreground mt-2">{collection.description}</p>
        )}
      </header>

      <main>
        {items.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "This collection is empty. Add posts from the editor.",
              comment: "@context: Empty state message",
            })}
          </p>
        ) : (
          <TimelineFeed items={items} />
        )}
      </main>
    </div>
  );
};
