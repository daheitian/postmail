/**
 * Collection Form
 *
 * Server-rendered shell that provides data/labels to the Lit component
 * `<jant-collection-form>`. Includes heading and SSR fallback skeleton.
 */

import { useLingui } from "@lingui/react/macro";
import type { FC } from "hono/jsx";
import type { Collection } from "../../../types.js";

interface CollectionFormProps {
  collection?: Collection;
  isEdit?: boolean;
}

export const CollectionForm: FC<CollectionFormProps> = ({
  collection,
  isEdit,
}) => {
  const { t } = useLingui();

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

  const labels = JSON.stringify({
    titleLabel: t({
      message: "Title",
      comment: "@context: Collection form field",
    }),
    titlePlaceholder: t({
      message: "My Collection",
      comment: "@context: Collection title placeholder",
    }),
    slugLabel: t({
      message: "Slug",
      comment: "@context: Collection form field",
    }),
    slugHelp: t({
      message:
        "URL-safe identifier (lowercase, numbers, hyphens). For CJK titles, slug will be auto-generated on the server.",
      comment: "@context: Collection path help text",
    }),
    descriptionLabel: t({
      message: "Description (optional)",
      comment: "@context: Collection form field",
    }),
    descriptionPlaceholder: t({
      message: "What's this collection about?",
      comment: "@context: Collection description placeholder",
    }),
    iconLabel: t({
      message: "Icon (optional)",
      comment: "@context: Collection form field",
    }),
    chooseIcon: t({
      message: "Choose Icon",
      comment: "@context: Button to open icon picker",
    }),
    removeIcon: t({
      message: "Remove",
      comment: "@context: Button to remove icon",
    }),
    dialogTitle: t({
      message: "Choose Icon",
      comment: "@context: Icon picker dialog title",
    }),
    dialogClose: t({
      message: "Close",
      comment: "@context: Button to close icon picker",
    }),
    searchIconsPlaceholder: t({
      message: "Search icons...",
      comment: "@context: Icon picker search placeholder",
    }),
    sortOrderLabel: t({
      message: "Sort Order",
      comment: "@context: Collection form field",
    }),
    sortNewest: t({
      message: "Newest first",
      comment: "@context: Collection sort order option",
    }),
    sortOldest: t({
      message: "Oldest first",
      comment: "@context: Collection sort order option",
    }),
    sortRatingDesc: t({
      message: "Highest rated",
      comment: "@context: Collection sort order option",
    }),
    sortRatingAsc: t({
      message: "Lowest rated",
      comment: "@context: Collection sort order option",
    }),
    submitLabel,
    cancelLabel: t({
      message: "Cancel",
      comment: "@context: Button to cancel form",
    }),
  }).replace(/</g, "\\u003c");

  const initial = JSON.stringify({
    title: collection?.title ?? "",
    slug: collection?.slug ?? "",
    description: collection?.description ?? "",
    sortOrder: collection?.sortOrder ?? "newest",
    icon: collection?.icon ?? "",
  }).replace(/</g, "\\u003c");

  const action = isEdit
    ? `/dash/collections/${collection?.id}`
    : "/dash/collections";

  const cancelHref = isEdit
    ? `/dash/collections/${collection?.id}`
    : "/dash/collections";

  return (
    <>
      <h1 class="text-2xl font-semibold mb-6">{heading}</h1>

      <jant-collection-form
        labels={labels}
        initial={initial}
        action={action}
        cancel-href={cancelHref}
        is-edit={isEdit ? "true" : undefined}
      >
        <div class="flex flex-col gap-4 max-w-lg">
          <div class="field">
            <div class="label" style="min-height:1.5em"></div>
            <div class="input" style="height:2.75rem"></div>
          </div>
          <div class="field">
            <div class="label" style="min-height:1.5em"></div>
            <div class="input" style="height:2.75rem"></div>
          </div>
          <div class="field">
            <div class="label" style="min-height:1.5em"></div>
            <div class="textarea" style="height:6rem"></div>
          </div>
          <div class="field">
            <div class="label" style="min-height:1.5em"></div>
            <div class="input" style="height:2.75rem"></div>
          </div>
          <div class="flex gap-2">
            <div class="btn" style="height:2.75rem;min-width:7rem"></div>
            <div
              class="btn-outline"
              style="height:2.75rem;min-width:5rem"
            ></div>
          </div>
        </div>
      </jant-collection-form>
    </>
  );
};
