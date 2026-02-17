/**
 * Shared collection form (new + edit)
 */

import { useLingui } from "@lingui/react/macro";
import type { Collection } from "../../../types.js";

export function CollectionForm({
  collection,
  isEdit,
}: {
  collection?: Collection;
  isEdit?: boolean;
}) {
  const { t } = useLingui();

  const signals = JSON.stringify({
    title: collection?.title ?? "",
    slug: collection?.slug ?? "",
    description: collection?.description ?? "",
  }).replace(/</g, "\\u003c");

  const action = isEdit
    ? `/dash/collections/${collection?.id}`
    : "/dash/collections";

  const heading = isEdit
    ? t({ message: "Edit Collection", comment: "@context: Page heading" })
    : t({ message: "New Collection", comment: "@context: Page heading" });

  const submitLabel = isEdit
    ? t({
        message: "Update Collection",
        comment: "@context: Button to save collection changes",
      })
    : t({
        message: "Create Collection",
        comment: "@context: Button to save new collection",
      });

  const cancelHref = isEdit
    ? `/dash/collections/${collection?.id}`
    : "/dash/collections";

  return (
    <>
      <h1 class="text-2xl font-semibold mb-6">{heading}</h1>

      <form
        data-signals={signals}
        data-on:submit__prevent={`@post('${action}')`}
        data-indicator="_loading"
        class="flex flex-col gap-4 max-w-lg"
      >
        <div class="field">
          <label class="label">
            {t({
              message: "Title",
              comment: "@context: Collection form field",
            })}
          </label>
          <input
            type="text"
            data-bind="title"
            class="input"
            required
            placeholder={
              isEdit
                ? undefined
                : t({
                    message: "My Collection",
                    comment: "@context: Collection title placeholder",
                  })
            }
          />
        </div>

        <div class="field">
          <label class="label">
            {t({ message: "Slug", comment: "@context: Collection form field" })}
          </label>
          <input
            type="text"
            data-bind="slug"
            class="input"
            required
            pattern="[a-z0-9-]+"
            placeholder={isEdit ? undefined : "my-collection"}
          />
          {!isEdit && (
            <p class="text-xs text-muted-foreground mt-1">
              {t({
                message: "URL-safe identifier (lowercase, numbers, hyphens)",
                comment: "@context: Collection path help text",
              })}
            </p>
          )}
        </div>

        <div class="field">
          <label class="label">
            {t({
              message: "Description (optional)",
              comment: "@context: Collection form field",
            })}
          </label>
          <textarea
            data-bind="description"
            class="textarea"
            rows={3}
            placeholder={
              isEdit
                ? undefined
                : t({
                    message: "What's this collection about?",
                    comment: "@context: Collection description placeholder",
                  })
            }
          >
            {collection?.description ?? ""}
          </textarea>
        </div>

        <div class="flex gap-2">
          <button type="submit" class="btn" data-attr-disabled="$_loading">
            <span data-show="!$_loading">{submitLabel}</span>
            <span data-show="$_loading">
              {t({
                message: "Processing...",
                comment:
                  "@context: Loading text shown on submit button while request is in progress",
              })}
            </span>
          </button>
          <a href={cancelHref} class="btn-outline">
            {t({
              message: "Cancel",
              comment: "@context: Button to cancel form",
            })}
          </a>
        </div>
      </form>
    </>
  );
}
