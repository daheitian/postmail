import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionDirectoryItem } from "../../types.js";
import { renderCollectionIcon } from "../../lib/icons.js";

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
          return (
            <div
              key={item.id}
              class="collection-directory-divider"
              aria-hidden="true"
            >
              <hr class="border-border" />
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
