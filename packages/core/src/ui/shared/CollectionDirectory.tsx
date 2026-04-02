import { msg } from "@lingui/core/macro";
import type { FC } from "hono/jsx";
import { useLingui } from "../../i18n/context.js";
import type { CollectionDirectoryItem } from "../../types.js";
import { getDividerCollectionGroup } from "../../lib/collection-groups.js";
import { formatRelativeAge, toISOString } from "../../lib/time.js";
import { toPublicHref, toPublicPath } from "../../lib/url.js";

export interface CollectionDirectoryProps {
  items: CollectionDirectoryItem[];
  emptyMessage?: string;
  sitePathPrefix?: string;
}

const hasDirectoryContent = (items: CollectionDirectoryItem[]) =>
  items.some(
    (item) =>
      (item.type === "collection" && item.collection) ||
      (item.type === "link" && item.label && item.url),
  );

const formatSequence = (value: number) => String(value).padStart(2, "0");

export const CollectionDirectory: FC<CollectionDirectoryProps> = ({
  items,
  emptyMessage,
  sitePathPrefix = "",
}) => {
  const { i18n } = useLingui();

  if (!hasDirectoryContent(items)) {
    return (
      <p class="text-muted-foreground">
        {emptyMessage ??
          i18n._(
            msg({
              message:
                "No collections yet. Start one to organize posts by topic.",
              comment: "@context: Empty state message on collections page",
            }),
          )}
      </p>
    );
  }

  let itemIndex = 0;

  return (
    <div class="collection-directory">
      {items.map((item, index) => {
        if (item.type === "divider") {
          const hasLabel = !!item.label;
          const group = getDividerCollectionGroup(items, index);
          return (
            <div key={item.id} class="collection-directory-divider">
              <div
                class="collection-directory-divider-row"
                aria-hidden={hasLabel ? undefined : "true"}
              >
                {hasLabel ? (
                  <>
                    {group ? (
                      <a
                        href={toPublicPath(
                          `/c/${group.slugExpression}`,
                          sitePathPrefix,
                        )}
                        class="collection-directory-divider-link collection-directory-divider-text"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span class="collection-directory-divider-text">
                        {item.label}
                      </span>
                    )}
                    <hr class="collection-directory-divider-line" />
                  </>
                ) : (
                  <hr class="collection-directory-divider-line" />
                )}
              </div>
            </div>
          );
        }

        if (item.type === "link" && item.label && item.url) {
          itemIndex += 1;
          const sequence = formatSequence(itemIndex);

          return (
            <div
              key={item.id}
              class="collection-directory-item collection-directory-item-link"
            >
              <div class="collection-directory-main">
                <span class="collection-directory-sequence" aria-hidden="true">
                  {sequence}
                </span>
                <div class="collection-directory-title-row">
                  <a
                    href={toPublicHref(item.url, sitePathPrefix)}
                    class="collection-directory-title-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span class="collection-directory-title">
                      {item.label}
                      <span
                        class="collection-directory-title-marker"
                        aria-hidden="true"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l2.92-2.92a5 5 0 0 0-7.07-7.08L11.7 5.24" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-2.92 2.92a5 5 0 0 0 7.07 7.08l1.69-1.7" />
                        </svg>
                      </span>
                    </span>
                  </a>
                </div>
                <p class="collection-directory-summary">
                  <span class="collection-directory-meta">Link</span>
                </p>
              </div>
            </div>
          );
        }

        const collection = item.collection;
        if (!collection) return null;
        itemIndex += 1;
        const sequence = formatSequence(itemIndex);

        return (
          <div key={item.id} class="collection-directory-item">
            <div class="collection-directory-main">
              <span class="collection-directory-sequence" aria-hidden="true">
                {sequence}
              </span>
              <div class="collection-directory-title-row">
                <a
                  href={toPublicPath(`/c/${collection.slug}`, sitePathPrefix)}
                  class="collection-directory-title-link"
                >
                  <span class="collection-directory-title">
                    {collection.title}
                  </span>
                </a>
              </div>
              <p class="collection-directory-summary">
                <span class="collection-directory-meta">
                  {collection.postCount}{" "}
                  {collection.postCount === 1
                    ? i18n._(
                        msg({
                          message: "entry",
                          comment: "@context: Singular entry count label",
                        }),
                      )
                    : i18n._(
                        msg({
                          message: "entries",
                          comment: "@context: Plural entry count label",
                        }),
                      )}
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
          </div>
        );
      })}
    </div>
  );
};
