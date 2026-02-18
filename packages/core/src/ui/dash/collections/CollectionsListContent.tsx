/**
 * Collections list view with drag-and-drop reordering
 */

import { useLingui } from "@lingui/react/macro";
import type { Collection } from "../../../types.js";
import {
  EmptyState,
  ListItemRow,
  ActionButtons,
  CrudPageHeader,
} from "../index.js";
import { renderCollectionIcon } from "../../../lib/icons.js";

export function CollectionsListContent({
  collections,
  postCounts,
}: {
  collections: Collection[];
  postCounts: Map<number, number>;
}) {
  const { t } = useLingui();

  return (
    <>
      <CrudPageHeader
        title={t({
          message: "Collections",
          comment: "@context: Dashboard heading",
        })}
        ctaLabel={t({
          message: "New Collection",
          comment: "@context: Button to create new collection",
        })}
        ctaHref="/dash/collections/new"
      />

      {collections.length === 0 ? (
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
        <div id="collections-list" class="flex flex-col divide-y">
          {collections.map((col) => {
            const count = postCounts.get(col.id) ?? 0;
            return (
              <>
                {col.showDivider === 1 && (
                  <div class="py-2">
                    <hr class="border-border" />
                  </div>
                )}
                <ListItemRow
                  key={col.id}
                  actions={
                    <ActionButtons
                      editHref={`/dash/collections/${col.id}/edit`}
                      editLabel={t({
                        message: "Edit",
                        comment: "@context: Button to edit collection",
                      })}
                      viewHref={`/c/${col.slug}`}
                      viewLabel={t({
                        message: "View",
                        comment: "@context: Button to view collection",
                      })}
                    />
                  }
                >
                  <div
                    class="flex items-center gap-3 cursor-grab"
                    data-id={col.id}
                  >
                    <span class="text-muted-foreground select-none">⠿</span>
                    <div>
                      <div class="flex items-center gap-2">
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
                      <p class="text-sm text-muted-foreground">/c/{col.slug}</p>
                    </div>
                  </div>
                </ListItemRow>
              </>
            );
          })}
        </div>
      )}
    </>
  );
}
