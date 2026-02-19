/**
 * Collections list view with drag-and-drop reordering
 */

import { useLingui } from "@lingui/react/macro";
import type { Collection, CollectionDivider } from "../../../types.js";
import { EmptyState, ActionButtons, CrudPageHeader } from "../index.js";
import { renderCollectionIcon } from "../../../lib/icons.js";

type ListItem =
  | { type: "collection"; data: Collection }
  | { type: "divider"; data: CollectionDivider };

export function CollectionsListContent({
  collections,
  dividers,
  postCounts,
}: {
  collections: Collection[];
  dividers: CollectionDivider[];
  postCounts: Map<number, number>;
}) {
  const { t } = useLingui();

  const items: ListItem[] = [
    ...collections.map((c) => ({ type: "collection", data: c }) as ListItem),
    ...dividers.map((d) => ({ type: "divider", data: d }) as ListItem),
  ].sort((a, b) => a.data.position - b.data.position);

  const hasItems = collections.length > 0 || dividers.length > 0;

  return (
    <>
      <CrudPageHeader
        title={t({
          message: "Collections",
          comment: "@context: Dashboard heading",
        })}
      >
        <div class="flex items-center gap-2">
          <form method="post" action="/dash/collections/dividers">
            <button type="submit" class="btn-sm-outline">
              {t({
                message: "New Divider",
                comment: "@context: Button to add divider between collections",
              })}
            </button>
          </form>
          <a href="/dash/collections/new" class="btn-sm">
            {t({
              message: "New Collection",
              comment: "@context: Button to create new collection",
            })}
          </a>
        </div>
      </CrudPageHeader>

      {!hasItems ? (
        <EmptyState
          message={t({
            message: "No collections yet.",
            comment: "@context: Empty state message",
          })}
          ctaText={t({
            message: "New Collection",
            comment: "@context: Button to create new collection",
          })}
          ctaHref="/dash/collections/new"
        />
      ) : (
        <div id="collections-list" class="flex flex-col">
          {items.map((item) => {
            if (item.type === "divider") {
              return (
                <div
                  key={`d-${item.data.id}`}
                  class="py-2 flex items-center gap-4"
                >
                  <div
                    class="flex-1 min-w-0 flex items-center gap-3 cursor-grab"
                    data-id={`d-${item.data.id}`}
                  >
                    <span class="text-muted-foreground select-none">⠿</span>
                    <hr class="flex-1 border-border" />
                  </div>
                  <form
                    method="post"
                    action={`/dash/collections/dividers/${item.data.id}/delete`}
                  >
                    <button
                      type="submit"
                      class="btn-sm-ghost text-muted-foreground hover:text-destructive"
                      title={t({
                        message: "Remove divider",
                        comment: "@context: Button to delete a divider",
                      })}
                    >
                      ✕
                    </button>
                  </form>
                </div>
              );
            }

            const col = item.data;
            const count = postCounts.get(col.id) ?? 0;
            return (
              <div key={`c-${col.id}`} class="py-2 flex items-center gap-4">
                <div
                  class="flex-1 min-w-0 flex items-center gap-3 cursor-grab"
                  data-id={`c-${col.id}`}
                >
                  <span class="text-muted-foreground select-none">⠿</span>
                  {col.icon && (
                    <span
                      class="flex items-center justify-center w-5 h-5 shrink-0"
                      dangerouslySetInnerHTML={{
                        __html: renderCollectionIcon(col.icon, {
                          size: 18,
                        }),
                      }}
                    />
                  )}
                  <a
                    href={`/dash/collections/${col.id}`}
                    class="font-medium hover:underline"
                  >
                    {col.title}
                  </a>
                  <span class="badge-secondary">{count}</span>
                </div>
                <ActionButtons
                  editHref={`/dash/collections/${col.id}/edit`}
                  editLabel={t({
                    message: "Edit",
                    comment: "@context: Button to edit collection",
                  })}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
