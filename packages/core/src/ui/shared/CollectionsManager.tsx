import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionDirectoryItem } from "../../types.js";
import { toPublicPath } from "../../lib/url.js";
import { CollectionDirectory } from "./CollectionDirectory.js";
import { getCollectionMutationLabels } from "./collection-management-labels.js";

const escapeJson = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c");

const countCollections = (items: CollectionDirectoryItem[]) =>
  items.filter((item) => item.type === "collection" && item.collection).length;

export interface CollectionsManagerProps {
  items: CollectionDirectoryItem[];
  sitePathPrefix?: string;
}

export const CollectionsManager: FC<CollectionsManagerProps> = ({
  items,
  sitePathPrefix = "",
}) => {
  const { t } = useLingui();
  const collectionsHref = toPublicPath("/c", sitePathPrefix);
  const newCollectionHref = toPublicPath(
    `/c/new?returnTo=${encodeURIComponent(collectionsHref)}`,
    sitePathPrefix,
  );
  const collectionCount = countCollections(items);
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
  const mutationLabels = getCollectionMutationLabels(t);

  const labels = {
    collectionsTitle: t({
      message: "Collections",
      comment: "@context: Collections page heading",
    }),
    collectionSingular: t({
      message: "collection",
      comment: "@context: Singular collection count label",
    }),
    collectionPlural: t({
      message: "collections",
      comment: "@context: Plural collection count label",
    }),
    organize: t({
      message: "Organize",
      comment: "@context: Menu action to organize collections",
    }),
    done: t({
      message: "Done",
      comment: "@context: Button to exit collection organize mode",
    }),
    organizeHint: t({
      message: "Drag collections and dividers into the order you want.",
      comment: "@context: Helper text shown while organizing collections",
    }),
    newDivider: t({
      message: "New Divider",
      comment: "@context: Menu action to create a divider on collections page",
    }),
    dividerLabel: t({
      message: "Divider",
      comment:
        "@context: Label for a divider item while organizing collections",
    }),
    dividerLabelPlaceholder: t({
      message: "Label (optional)",
      comment:
        "@context: Placeholder for an optional divider label in collections organize mode",
    }),
    newCollection: t({
      message: "New Collection",
      comment: "@context: Button to create a collection from collections page",
    }),
    deleteDivider: t({
      message: "Remove Divider",
      comment: "@context: Tooltip for divider delete button",
    }),
    entrySingular: t({
      message: "entry",
      comment: "@context: Singular entry count label",
    }),
    entryPlural: t({
      message: "entries",
      comment: "@context: Plural entry count label",
    }),
    emptyState: t({
      message: "No collections yet. Start one to organize posts by topic.",
      comment: "@context: Empty state message on collections page",
    }),
    orderSaved: t({
      message: "Order saved",
      comment: "@context: Toast after reordering collections",
    }),
    ...mutationLabels,
  };

  return (
    <div class="collections-page-shell" data-collections-manager-root>
      <header class="collections-page-header">
        <div class="collections-page-heading page-intro">
          <div class="page-intro-title-row">
            <h1 class="page-intro-title">{labels.collectionsTitle}</h1>
          </div>
          <div class="page-intro-meta-row">
            <p class="page-intro-meta" data-collections-count>
              {collectionCountLabel}
            </p>
            <div class="collections-page-actions">
              <div
                class="collections-page-action-group"
                data-collections-reorder-actions
                hidden
              >
                <button
                  type="button"
                  class="btn-outline"
                  data-collections-action="divider"
                >
                  {labels.newDivider}
                </button>
                <button
                  type="button"
                  class="btn-outline"
                  data-collections-action="done"
                >
                  {labels.done}
                </button>
              </div>
              <div
                class="collections-page-action-group"
                data-collections-toolbar
              >
                <a
                  href={newCollectionHref}
                  class="collections-page-toolbar-button"
                  aria-label={labels.newCollection}
                  title={labels.newCollection}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                </a>
                <div class="relative">
                  <button
                    type="button"
                    class="collections-page-toolbar-button collections-page-more-btn"
                    aria-label={labels.moreActions}
                    aria-expanded="false"
                    title={labels.moreActions}
                    data-collections-action="toggle-menu"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <circle cx="5" cy="12" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>
                  <div
                    class="collections-page-menu"
                    data-collections-more-menu
                    hidden
                  >
                    <button
                      type="button"
                      class="collections-page-menu-item"
                      data-collections-action="organize"
                    >
                      {labels.organize}
                    </button>
                    <button
                      type="button"
                      class="collections-page-menu-item"
                      data-collections-action="divider"
                    >
                      {labels.newDivider}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p class="page-intro-description" data-collections-hint hidden>
            {labels.organizeHint}
          </p>
        </div>
      </header>

      <jant-collections-manager
        items={escapeJson(items)}
        labels={escapeJson(labels)}
      >
        <CollectionDirectory
          items={items}
          emptyMessage={labels.emptyState}
          sitePathPrefix={sitePathPrefix}
        />
      </jant-collections-manager>
    </div>
  );
};
