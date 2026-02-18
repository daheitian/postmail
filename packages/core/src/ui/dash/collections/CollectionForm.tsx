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
    sortOrder: collection?.sortOrder ?? "newest",
    icon: collection?.icon ?? "",
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
            data-on:input={
              !isEdit
                ? "$slug = $title.toLowerCase().trim().replace(/[^\\w\\s-]/g, '').replace(/[\\s_-]+/g, '-').replace(/^-+|-+$/g, '')"
                : undefined
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
                message:
                  "URL-safe identifier (lowercase, numbers, hyphens). For CJK titles, slug will be auto-generated on the server.",
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

        <div class="field">
          <label class="label">
            {t({
              message: "Icon (optional)",
              comment: "@context: Collection form field",
            })}
          </label>
          <input
            type="text"
            data-bind="icon"
            class="input"
            placeholder={t({
              message: "Emoji or icon name",
              comment: "@context: Collection icon placeholder",
            })}
          />
        </div>

        <div class="field">
          <label class="label">
            {t({
              message: "Sort Order",
              comment: "@context: Collection form field",
            })}
          </label>
          <select data-bind="sortOrder" class="select">
            <option
              value="newest"
              selected={
                collection?.sortOrder === "newest" || !collection?.sortOrder
              }
            >
              {t({
                message: "Newest first",
                comment: "@context: Collection sort order option",
              })}
            </option>
            <option
              value="oldest"
              selected={collection?.sortOrder === "oldest"}
            >
              {t({
                message: "Oldest first",
                comment: "@context: Collection sort order option",
              })}
            </option>
            <option
              value="rating_desc"
              selected={collection?.sortOrder === "rating_desc"}
            >
              {t({
                message: "Highest rated",
                comment: "@context: Collection sort order option",
              })}
            </option>
            <option
              value="rating_asc"
              selected={collection?.sortOrder === "rating_asc"}
            >
              {t({
                message: "Lowest rated",
                comment: "@context: Collection sort order option",
              })}
            </option>
          </select>
        </div>

        <div class="flex gap-2">
          <button type="submit" class="btn" data-attr:disabled="$_loading">
            <svg
              data-show="$_loading"
              style="display:none"
              class="animate-spin size-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              role="status"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {submitLabel}
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
