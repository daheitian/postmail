/**
 * Collections Listing Page
 *
 * Single-column directory of collections.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionsPageProps } from "../../types.js";
import { CollectionDirectory } from "../shared/CollectionDirectory.js";
import { CollectionsManager } from "../shared/CollectionsManager.js";

export const CollectionsPage: FC<CollectionsPageProps> = ({
  items,
  isAuthenticated,
}) => {
  const { t } = useLingui();
  const pageDescription = t({
    message: "Browse by topic, not chronology.",
    comment: "@context: Introductory description on the collections page",
  });
  const emptyMessage = t({
    message: "No collections yet. Start one to organize posts by topic.",
    comment: "@context: Empty state message on collections page",
  });

  if (isAuthenticated) {
    return (
      <div class="py-6" data-page="collections">
        <CollectionsManager items={items} />
      </div>
    );
  }

  return (
    <div class="py-6" data-page="collections">
      <div class="collections-page-shell">
        <header class="collections-page-header">
          <div class="collections-page-heading">
            <h1 class="text-2xl font-semibold">
              {t({
                message: "Collections",
                comment: "@context: Collections page heading",
              })}
            </h1>
            <p class="collections-page-description">{pageDescription}</p>
          </div>
        </header>

        <CollectionDirectory items={items} emptyMessage={emptyMessage} />
      </div>
    </div>
  );
};
