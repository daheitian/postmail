/**
 * Collection Editor Page
 *
 * Full-page create/edit flow for collections.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionEditorPageProps } from "../../types.js";
import { toPublicPath } from "../../lib/url.js";
import {
  getCollectionFormLabels,
  getCollectionMutationLabels,
} from "../shared/collection-management-labels.js";

const escapeJson = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c");

export const CollectionEditorPage: FC<CollectionEditorPageProps> = ({
  mode,
  collection,
  cancelHref,
  sitePathPrefix = "",
}) => {
  const { t } = useLingui();
  const formLabels = getCollectionFormLabels(t);
  const mutationLabels = getCollectionMutationLabels(t);
  const collectionsHref = toPublicPath("/c", sitePathPrefix);
  const collectionHref = collection
    ? toPublicPath(`/c/${collection.slug}`, sitePathPrefix)
    : null;
  const initial = collection
    ? {
        title: collection.title,
        slug: collection.slug,
        description: collection.description ?? "",
        sortOrder: collection.sortOrder ?? "newest",
      }
    : {
        title: "",
        slug: "",
        description: "",
        sortOrder: "newest",
      };
  const title =
    mode === "create"
      ? t({
          message: "New Collection",
          comment: "@context: Page title for new collection",
        })
      : (collection?.title ??
        t({
          message: "Edit",
          comment: "@context: Per-collection edit action",
        }));

  return (
    <div class="py-6" data-page="collection-editor">
      <div class="collection-editor-shell">
        <header class="collection-editor-header page-intro">
          <nav
            class="collection-breadcrumb"
            aria-label={t({
              message: "Breadcrumb",
              comment: "@context: Breadcrumb label on collection editor page",
            })}
          >
            <ol>
              <li>
                <a href={collectionsHref}>
                  {t({
                    message: "Collections",
                    comment: "@context: Breadcrumb link to collections page",
                  })}
                </a>
              </li>
              {mode === "edit" && collectionHref && collection ? (
                <>
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
                    <a href={collectionHref}>{collection.title}</a>
                  </li>
                </>
              ) : null}
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
                <span>
                  {mode === "create"
                    ? t({
                        message: "New Collection",
                        comment: "@context: Page title for new collection",
                      })
                    : t({
                        message: "Edit",
                        comment: "@context: Per-collection edit action",
                      })}
                </span>
              </li>
            </ol>
          </nav>

          <div class="collection-editor-title-block page-intro-title-row">
            <h1 class="collection-editor-title page-intro-title">{title}</h1>
          </div>
        </header>

        <section
          class="collection-editor-card"
          data-collection-editor-page
          data-collection-editor-save-failed={mutationLabels.saveFailed}
        >
          <jant-collection-form
            labels={escapeJson(formLabels)}
            initial={escapeJson(initial)}
            action={
              collection
                ? `/api/collections/${collection.id}`
                : "/api/collections"
            }
            cancel-href={cancelHref}
            {...(mode === "edit" ? { "is-edit": "" } : {})}
          ></jant-collection-form>
        </section>
      </div>
    </div>
  );
};
