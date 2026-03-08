/**
 * Collections Sidebar
 *
 * Shared sidebar navigation for public collection pages.
 * - Anonymous users: static nav with collections and dividers from sidebar items
 * - Authenticated users: interactive Lit component with CRUD, reorder, divider management
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { Collection, SidebarItem } from "../../types.js";
import { renderCollectionIcon } from "../../lib/icons.js";

const escapeJson = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c");

export interface CollectionsSidebarProps {
  collections: Collection[];
  sidebarItems: SidebarItem[];
  activeSlug?: string;
  isAuthenticated?: boolean;
  postCounts?: Map<string, number>;
}

export const CollectionsSidebar: FC<CollectionsSidebarProps> = ({
  collections,
  sidebarItems,
  activeSlug,
  isAuthenticated,
  postCounts,
}) => {
  if (isAuthenticated) {
    return (
      <AuthenticatedSidebar
        collections={collections}
        sidebarItems={sidebarItems}
        activeSlug={activeSlug}
        postCounts={postCounts}
      />
    );
  }

  return (
    <AnonymousSidebar
      collections={collections}
      sidebarItems={sidebarItems}
      activeSlug={activeSlug}
    />
  );
};

// ---------------------------------------------------------------------------
// Anonymous: static HTML nav
// ---------------------------------------------------------------------------

const AnonymousSidebar: FC<{
  collections: Collection[];
  sidebarItems: SidebarItem[];
  activeSlug?: string;
}> = ({ collections, sidebarItems, activeSlug }) => {
  const { t } = useLingui();

  // Build collection lookup
  const collectionMap = new Map(collections.map((c) => [c.id, c]));

  return (
    <nav class="flex flex-col gap-1 pt-6">
      <h2 class="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t({
          message: "Collections",
          comment: "@context: Sidebar heading for collections nav",
        })}
      </h2>
      {sidebarItems.map((item) => {
        if (item.type === "divider") {
          return (
            <div key={item.id} class="px-3 py-1">
              <hr class="border-border" />
            </div>
          );
        }
        const col = item.collectionId
          ? collectionMap.get(item.collectionId)
          : undefined;
        if (!col) return null;
        const isActive = col.slug === activeSlug;
        return (
          <a
            key={item.id}
            href={`/c/${col.slug}`}
            class={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-md truncate ${
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <span
              class="flex items-center justify-center w-4 h-4 shrink-0"
              dangerouslySetInnerHTML={{
                __html: renderCollectionIcon(col.icon, {
                  size: 16,
                  fallback: true,
                }),
              }}
            />
            <span class="truncate">{col.title}</span>
          </a>
        );
      })}
    </nav>
  );
};

// ---------------------------------------------------------------------------
// Authenticated: Lit component shell
// ---------------------------------------------------------------------------

const AuthenticatedSidebar: FC<{
  collections: Collection[];
  sidebarItems: SidebarItem[];
  activeSlug?: string;
  postCounts?: Map<string, number>;
}> = ({ collections, sidebarItems, activeSlug, postCounts }) => {
  const { t } = useLingui();

  // Build collection lookup for enriching sidebar items
  const collectionMap = new Map(
    collections.map((col) => [
      col.id,
      {
        id: col.id,
        slug: col.slug,
        title: col.title,
        description: col.description,
        icon: col.icon,
        sortOrder: col.sortOrder,
        postCount: postCounts?.get(col.id) ?? 0,
      },
    ]),
  );

  const clientSidebarItems = sidebarItems.map((item) => ({
    id: item.id,
    type: item.type,
    collectionId: item.collectionId,
    position: item.position,
    collection: item.collectionId
      ? collectionMap.get(item.collectionId)
      : undefined,
  }));

  const labels = {
    collections: t({
      message: "Collections",
      comment: "@context: Sidebar heading for collections nav",
    }),
    reorder: t({
      message: "Reorder",
      comment: "@context: Menu action to reorder collections",
    }),
    done: t({
      message: "Done",
      comment: "@context: Button to exit reorder mode",
    }),
    addDivider: t({
      message: "Add Divider",
      comment: "@context: Menu action to add a divider",
    }),
    newCollection: t({
      message: "New Collection",
      comment: "@context: Tooltip/aria for add collection button",
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
      comment: "@context: Aria-label for more button",
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
    <jant-collection-sidebar
      sidebar-items={escapeJson(clientSidebarItems)}
      labels={escapeJson(labels)}
      active-slug={activeSlug ?? ""}
    />
  );
};
