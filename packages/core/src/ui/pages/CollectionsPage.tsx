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

const countCollections = (items: CollectionsPageProps["items"]) =>
  items.filter((item) => item.type === "collection" && item.collection).length;

export const CollectionsPage: FC<CollectionsPageProps> = ({
  items,
  isAuthenticated,
  sitePathPrefix = "",
}) => {
  const { t } = useLingui();
  const collectionCount = countCollections(items);
  const emptyMessage = t({
    message: "No collections yet. Start one to organize posts by topic.",
    comment: "@context: Empty state message on collections page",
  });
  const collectionCountLabel = `${collectionCount} ${
    collectionCount === 1
      ? t({
          message: "collection",
          comment: "@context: Singular collection count label",
        })
      : t({
          message: "collections",
          comment: "@context: Plural collection count label",
        })
  }`;

  if (isAuthenticated) {
    return (
      <div class="py-6" data-page="collections">
        <CollectionsManager items={items} sitePathPrefix={sitePathPrefix} />
      </div>
    );
  }

  return (
    <div class="py-6" data-page="collections">
      <div class="collections-page-shell">
        <header class="collections-page-header">
          <div class="collections-page-heading page-intro">
            <div class="page-intro-title-row">
              <h1 class="page-intro-title">
                {t({
                  message: "Collections",
                  comment: "@context: Collections page heading",
                })}
              </h1>
            </div>
            <div class="page-intro-meta-row">
              <p class="page-intro-meta">{collectionCountLabel}</p>
            </div>
          </div>
        </header>

        <CollectionDirectory
          items={items}
          emptyMessage={emptyMessage}
          sitePathPrefix={sitePathPrefix}
        />
      </div>
    </div>
  );
};
