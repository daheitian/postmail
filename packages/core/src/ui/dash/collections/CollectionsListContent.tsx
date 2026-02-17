/**
 * Collections list view
 */

import { useLingui } from "@lingui/react/macro";
import type { Collection } from "../../../types.js";
import {
  EmptyState,
  ListItemRow,
  ActionButtons,
  CrudPageHeader,
} from "../index.js";

export function CollectionsListContent({
  collections,
}: {
  collections: Collection[];
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
        <div class="flex flex-col divide-y">
          {collections.map((col) => (
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
              <a
                href={`/dash/collections/${col.id}`}
                class="font-medium hover:underline"
              >
                {col.title}
              </a>
              <p class="text-sm text-muted-foreground">/{col.slug}</p>
              {col.description && (
                <p class="text-sm text-muted-foreground mt-1">
                  {col.description}
                </p>
              )}
            </ListItemRow>
          ))}
        </div>
      )}
    </>
  );
}
