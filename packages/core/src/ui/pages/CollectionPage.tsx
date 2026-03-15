/**
 * Collection Page
 *
 * Collection header with breadcrumb, description, sorting, and timeline feed.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionPageProps } from "../../types.js";
import { renderCollectionIcon } from "../../lib/icons.js";
import { formatPageLabel } from "../../lib/pagination.js";
import { TimelineFeed } from "../feed/TimelineFeed.js";

export const CollectionPage: FC<CollectionPageProps> = ({
  collection,
  items,
  totalCount,
  currentPage,
  totalPages,
  baseUrl,
  currentSort,
  defaultSort,
  showRatingSort,
}) => {
  const { t } = useLingui();
  const iconHtml = renderCollectionIcon(collection.icon, { size: 28 });
  const collectionUrl = `/c/${collection.slug}`;
  const sortTriggerId = `collection-sort-trigger-${collection.id}`;
  const sortPopoverId = `collection-sort-popover-${collection.id}`;
  const pageLabel =
    currentPage > 1 ? formatPageLabel(currentPage, totalPages) : null;
  const sortOptions = [
    {
      value: "newest",
      label: t({
        message: "Newest first",
        comment: "@context: Collection sort order option",
      }),
    },
    {
      value: "oldest",
      label: t({
        message: "Oldest first",
        comment: "@context: Collection sort order option",
      }),
    },
    ...(showRatingSort
      ? [
          {
            value: "rating_desc",
            label: t({
              message: "Highest rated",
              comment: "@context: Collection sort order option",
            }),
          },
          {
            value: "rating_asc",
            label: t({
              message: "Lowest rated",
              comment: "@context: Collection sort order option",
            }),
          },
        ]
      : []),
  ] as const;
  const currentSortLabel =
    sortOptions.find((option) => option.value === currentSort)?.label ??
    sortOptions[0].label;

  return (
    <div class="py-6" data-page="collection">
      <header class="collection-page-header">
        <nav
          class="collection-breadcrumb"
          aria-label={t({
            message: "Breadcrumb",
            comment: "@context: Breadcrumb label on collection detail page",
          })}
        >
          <ol>
            <li>
              <a href="/c">
                {t({
                  message: "Collections",
                  comment: "@context: Breadcrumb link to collections page",
                })}
              </a>
            </li>
            <li aria-hidden="true">
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
                <path d="m9 18 6-6-6-6" />
              </svg>
            </li>
            <li>
              <span>{collection.title}</span>
            </li>
          </ol>
        </nav>

        <div class="collection-page-title-row">
          <div class="collection-page-title-block">
            <h1 class="collection-page-title">
              {iconHtml && (
                <span
                  class="shrink-0"
                  dangerouslySetInnerHTML={{ __html: iconHtml }}
                />
              )}
              <span>{collection.title}</span>
            </h1>
            {collection.description ? (
              <p class="collection-page-description">
                {collection.description}
              </p>
            ) : null}
            <p class="collection-page-meta">
              {totalCount}{" "}
              {totalCount === 1
                ? t({
                    message: "entry",
                    comment: "@context: Singular entry count label",
                  })
                : t({
                    message: "entries",
                    comment: "@context: Plural entry count label",
                  })}
              {pageLabel ? <span> / {pageLabel}</span> : null}
            </p>
          </div>

          <div class="collection-sort-menu">
            <button
              type="button"
              id={sortTriggerId}
              class="btn-outline collection-sort-trigger"
              aria-haspopup="menu"
              aria-controls={sortPopoverId}
              aria-expanded="false"
            >
              <span>
                {t({
                  message: "Sort",
                  comment:
                    "@context: Sort menu label on collection detail page",
                })}
                : {currentSortLabel}
              </span>
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
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div
              id={sortPopoverId}
              class="collection-sort-popover"
              data-popover
              data-align="end"
              aria-hidden="true"
            >
              <div
                class="collection-sort-options"
                role="menu"
                aria-labelledby={sortTriggerId}
                data-collection-sort-options
              >
                {sortOptions.map((option) => (
                  <a
                    key={option.value}
                    href={
                      option.value === defaultSort
                        ? collectionUrl
                        : `${collectionUrl}?sort=${option.value}`
                    }
                    role="menuitem"
                    class={`collection-sort-option ${
                      option.value === currentSort
                        ? "collection-sort-option-active"
                        : ""
                    }`}
                    aria-current={
                      option.value === currentSort ? "true" : undefined
                    }
                  >
                    {option.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {items.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "This collection is empty. Add posts from the editor.",
              comment: "@context: Empty state message",
            })}
          </p>
        ) : (
          <TimelineFeed
            items={items}
            baseUrl={baseUrl}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        )}
      </main>
    </div>
  );
};
