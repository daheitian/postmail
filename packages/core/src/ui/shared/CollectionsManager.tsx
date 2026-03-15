import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionDirectoryItem } from "../../types.js";
import { CollectionDirectory } from "./CollectionDirectory.js";

const escapeJson = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c");

const countCollections = (items: CollectionDirectoryItem[]) =>
  items.filter((item) => item.type === "collection" && item.collection).length;

export interface CollectionsManagerProps {
  items: CollectionDirectoryItem[];
}

export const CollectionsManager: FC<CollectionsManagerProps> = ({ items }) => {
  const { t } = useLingui();
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
    edit: t({
      message: "Edit",
      comment: "@context: Per-collection edit action",
    }),
    deleteDivider: t({
      message: "Remove Divider",
      comment: "@context: Tooltip for divider delete button",
    }),
    moreActions: t({
      message: "More actions",
      comment: "@context: Aria-label for collections page more button",
    }),
    deleteCollection: t({
      message: "Delete",
      comment: "@context: Delete collection action",
    }),
    confirmDelete: t({
      message:
        "Delete this collection permanently? Posts inside won't be removed.",
      comment: "@context: Confirm dialog for deleting a collection",
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
    saved: t({
      message: "Saved",
      comment: "@context: Toast after saving a collection",
    }),
    saveFailed: t({
      message: "Couldn't save. Try again in a moment.",
      comment: "@context: Toast when save fails",
    }),
    deleted: t({
      message: "Deleted",
      comment: "@context: Toast after deleting a collection",
    }),
    formLabels: {
      titleLabel: t({
        message: "Title",
        comment: "@context: Collection form field",
      }),
      titlePlaceholder: t({
        message: "My Collection",
        comment: "@context: Collection title placeholder",
      }),
      slugLabel: t({
        message: "Slug",
        comment: "@context: Collection form field",
      }),
      slugHelp: t({
        message:
          "URL-safe identifier (lowercase, numbers, hyphens). For CJK titles, slug will be auto-generated on the server.",
        comment: "@context: Collection path help text",
      }),
      descriptionLabel: t({
        message: "Description (optional)",
        comment: "@context: Collection form field",
      }),
      descriptionPlaceholder: t({
        message: "What's this collection about?",
        comment: "@context: Collection description placeholder",
      }),
      removeIcon: t({
        message: "Remove",
        comment: "@context: Button to remove icon",
      }),
      iconsTab: t({
        message: "Icons",
        comment: "@context: Icon picker tab label",
      }),
      emojisTab: t({
        message: "Emojis",
        comment: "@context: Emoji picker tab label",
      }),
      searchIconsPlaceholder: t({
        message: "Search icons...",
        comment: "@context: Icon picker search placeholder",
      }),
      searchEmojisPlaceholder: t({
        message: "Search emojis...",
        comment: "@context: Emoji picker search placeholder",
      }),
      sortOrderLabel: t({
        message: "Sort Order",
        comment: "@context: Collection form field",
      }),
      sortNewest: t({
        message: "Newest first",
        comment: "@context: Collection sort order option",
      }),
      sortOldest: t({
        message: "Oldest first",
        comment: "@context: Collection sort order option",
      }),
      sortRatingDesc: t({
        message: "Highest rated",
        comment: "@context: Collection sort order option",
      }),
      sortRatingAsc: t({
        message: "Lowest rated",
        comment: "@context: Collection sort order option",
      }),
      submitLabel: t({
        message: "Save",
        comment: "@context: Button to save collection",
      }),
      cancelLabel: t({
        message: "Cancel",
        comment: "@context: Button to cancel form",
      }),
    },
  };

  return (
    <jant-collections-manager
      items={escapeJson(items)}
      labels={escapeJson(labels)}
    >
      <div class="collections-page-shell">
        <header class="collections-page-header">
          <div class="collections-page-heading">
            <div class="collections-page-title-row">
              <h1 class="collections-page-title">{labels.collectionsTitle}</h1>
            </div>
            {collectionCount > 0 ? (
              <div class="collections-page-meta-row">
                <p class="collections-page-badge">{collectionCountLabel}</p>
              </div>
            ) : null}
          </div>
        </header>
        <CollectionDirectory items={items} emptyMessage={labels.emptyState} />
      </div>
    </jant-collections-manager>
  );
};
