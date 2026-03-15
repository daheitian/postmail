import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionDirectoryItem } from "../../types.js";
import { renderCollectionIcon } from "../../lib/icons.js";
import { formatRelativeAge, toISOString } from "../../lib/time.js";

export interface CollectionDirectoryProps {
  items: CollectionDirectoryItem[];
  emptyMessage?: string;
}

const hasCollections = (items: CollectionDirectoryItem[]) =>
  items.some((item) => item.type === "collection" && item.collection);

const formatSequence = (value: number) => String(value).padStart(2, "0");

export const CollectionDirectory: FC<CollectionDirectoryProps> = ({
  items,
  emptyMessage,
}) => {
  const { t } = useLingui();

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

  let collectionIndex = 0;

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
        collectionIndex += 1;
        const sequence = formatSequence(collectionIndex);

        return (
          <a
            key={item.id}
            href={`/c/${collection.slug}`}
            class="collection-directory-item"
          >
            <div class="collection-directory-main">
              <span class="collection-directory-sequence" aria-hidden="true">
                {sequence}
              </span>
              <div class="collection-directory-title-row">
                <span class="collection-directory-title">
                  <span
                    class="collection-directory-title-marker"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{
                      __html: renderCollectionIcon(collection.icon, {
                        size: 14,
                        fallback: true,
                      }),
                    }}
                  />
                  <span>{collection.title}</span>
                </span>
              </div>
              <p class="collection-directory-summary">
                <span class="collection-directory-meta">
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
                </span>
                <span
                  class="collection-directory-meta-separator"
                  aria-hidden="true"
                >
                  /
                </span>
                <time
                  class="collection-directory-updated"
                  dateTime={toISOString(collection.recentActivityAt)}
                >
                  {formatRelativeAge(collection.recentActivityAt)}
                </time>
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
};
