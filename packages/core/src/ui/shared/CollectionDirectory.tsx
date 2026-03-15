import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionDirectoryItem } from "../../types.js";
import { renderCollectionIcon } from "../../lib/icons.js";
import { formatDate, toISOString } from "../../lib/time.js";

export interface CollectionDirectoryProps {
  items: CollectionDirectoryItem[];
  emptyMessage?: string;
}

const hasCollections = (items: CollectionDirectoryItem[]) =>
  items.some((item) => item.type === "collection" && item.collection);

export const CollectionDirectory: FC<CollectionDirectoryProps> = ({
  items,
  emptyMessage,
}) => {
  const { t } = useLingui();
  const updatedLabel = t({
    message: "Updated",
    comment: "@context: Label before a collection's latest activity date",
  });

  if (!hasCollections(items)) {
    return (
      <p class="text-muted-foreground">
        {emptyMessage ??
          t({
            message:
              "No collections yet. Start one to organize posts by topic.",
            comment: "@context: Empty state message on collections page",
          })}
      </p>
    );
  }

  return (
    <div class="collection-directory">
      {items.map((item) => {
        if (item.type === "divider" || !item.collection) {
          const hasLabel = !!item.label;
          return (
            <div key={item.id} class="collection-directory-divider">
              <div
                class="collection-directory-divider-row"
                aria-hidden={hasLabel ? undefined : "true"}
              >
                {hasLabel ? (
                  <>
                    <span class="collection-directory-divider-text">
                      {item.label}
                    </span>
                    <hr class="collection-directory-divider-line" />
                  </>
                ) : (
                  <hr class="collection-directory-divider-line" />
                )}
              </div>
            </div>
          );
        }

        const collection = item.collection;

        return (
          <a
            key={item.id}
            href={`/c/${collection.slug}`}
            class="collection-directory-item"
          >
            <span
              class="collection-directory-icon"
              dangerouslySetInnerHTML={{
                __html: renderCollectionIcon(collection.icon, {
                  size: 20,
                  fallback: true,
                }),
              }}
            />
            <div class="collection-directory-copy">
              <div class="collection-directory-title-row">
                <span class="collection-directory-title">
                  {collection.title}
                </span>
                <time
                  class="collection-directory-updated"
                  dateTime={toISOString(collection.recentActivityAt)}
                >
                  {updatedLabel} {formatDate(collection.recentActivityAt)}
                </time>
              </div>
              {collection.description ? (
                <p class="collection-directory-description">
                  {collection.description}
                </p>
              ) : null}
              <p class="collection-directory-meta">
                {collection.postCount}{" "}
                {collection.postCount === 1
                  ? t({
                      message: "entry",
                      comment: "@context: Singular entry count label",
                    })
                  : t({
                      message: "entries",
                      comment: "@context: Plural entry count label",
                    })}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
};
