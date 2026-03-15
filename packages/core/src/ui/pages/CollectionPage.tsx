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
import { getCollectionMutationLabels } from "../shared/collection-management-labels.js";

const escapeJson = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c");

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
  isAuthenticated,
}) => {
  const { t } = useLingui();
  const iconHtml = renderCollectionIcon(collection.icon, { size: 28 });
  const collectionUrl = `/c/${collection.slug}`;
  const pageLabel =
    currentPage > 1 ? formatPageLabel(currentPage, totalPages) : null;
  const mutationLabels = getCollectionMutationLabels(t);
  const formInitial = {
    title: collection.title,
    slug: collection.slug,
    description: collection.description ?? "",
    sortOrder: collection.sortOrder ?? "newest",
    icon: collection.icon ?? "",
  };
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

          <div class="collection-page-controls">
            <details class="collection-sort-menu">
              <summary class="btn-outline collection-sort-trigger">
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
              </summary>
              <div class="collection-sort-popover">
                {sortOptions.map((option) => (
                  <a
                    key={option.value}
                    href={
                      option.value === defaultSort
                        ? collectionUrl
                        : `${collectionUrl}?sort=${option.value}`
                    }
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
            </details>

            {isAuthenticated ? (
              <div
                class="collection-page-manage"
                data-collection-page-actions
                data-collection-id={collection.id}
                data-collection-page-labels={escapeJson(mutationLabels)}
                data-collection-page-redirect-url="/c"
              >
                <button
                  type="button"
                  class="btn-outline collection-page-manage-trigger"
                  aria-label={mutationLabels.moreActions}
                  aria-expanded="false"
                  aria-haspopup="menu"
                  data-collection-page-action="toggle-menu"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </button>

                <div
                  class="collections-page-menu"
                  role="menu"
                  data-collection-page-menu
                  hidden
                >
                  <button
                    type="button"
                    class="collections-page-menu-item"
                    role="menuitem"
                    data-collection-page-action="edit"
                  >
                    {mutationLabels.edit}
                  </button>
                  <button
                    type="button"
                    class="collections-page-menu-item collections-page-menu-item-danger"
                    role="menuitem"
                    data-collection-page-action="delete"
                  >
                    {mutationLabels.deleteCollection}
                  </button>
                </div>

                <dialog
                  class="collection-page-dialog"
                  data-collection-page-dialog
                >
                  <jant-collection-form
                    labels={escapeJson(mutationLabels.formLabels)}
                    initial={escapeJson(formInitial)}
                    action={`/api/collections/${collection.id}`}
                    cancel-href="javascript:void(0)"
                    is-edit
                  ></jant-collection-form>
                </dialog>
              </div>
            ) : null}
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
