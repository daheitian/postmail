import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

type Translate = (descriptor: MessageDescriptor) => string;

const collectionFormMessages = {
  titleLabel: msg({
    message: "Title",
    comment: "@context: Collection form field",
  }),
  titlePlaceholder: msg({
    message: "My Collection",
    comment: "@context: Collection title placeholder",
  }),
  slugLabel: msg({
    message: "Collection link",
    comment: "@context: Collection form field",
  }),
  slugHelp: msg({
    message: "This is the last part of the collection link.",
    comment: "@context: Collection link help text",
  }),
  slugInvalidHelp: msg({
    message: "Use lowercase letters, numbers, and hyphens only.",
    comment:
      "@context: Collection slug validation error for invalid characters",
  }),
  slugReservedHelp: msg({
    message: "This link is reserved. Choose something else.",
    comment: "@context: Collection slug validation error for reserved paths",
  }),
  slugTooLongHelp: msg({
    message: "Keep this link under 200 characters.",
    comment:
      "@context: Collection slug validation error for links that are too long",
  }),
  editSlugLabel: msg({
    message: "Edit link",
    comment: "@context: Button to manually edit the collection link",
  }),
  resetSlugLabel: msg({
    message: "Reset link",
    comment:
      "@context: Button to restore the automatically generated collection link from the title",
  }),
  quickHint: msg({
    message: "More options are available after you create it.",
    comment: "@context: Helper text in the quick-create collection dialog",
  }),
  quickSubmitLabel: msg({
    message: "Done",
    comment: "@context: Primary button in the quick-create collection dialog",
  }),
  createdLabel: msg({
    message: "Collection created.",
    comment: "@context: Toast shown after creating a collection",
  }),
  descriptionLabel: msg({
    message: "Description (optional)",
    comment: "@context: Collection form field",
  }),
  descriptionPlaceholder: msg({
    message: "What's this collection about?",
    comment: "@context: Collection description placeholder",
  }),
  sortOrderLabel: msg({
    message: "Sort Order",
    comment: "@context: Collection form field",
  }),
  sortNewest: msg({
    message: "Newest first",
    comment: "@context: Collection sort order option",
  }),
  sortOldest: msg({
    message: "Oldest first",
    comment: "@context: Collection sort order option",
  }),
  sortRatingDesc: msg({
    message: "Highest rated",
    comment: "@context: Collection sort order option",
  }),
  submitLabel: msg({
    message: "Save",
    comment: "@context: Button to save collection",
  }),
  cancelLabel: msg({
    message: "Cancel",
    comment: "@context: Button to cancel form",
  }),
} as const;

const collectionMutationMessages = {
  edit: msg({
    message: "Edit",
    comment: "@context: Per-collection edit action",
  }),
  moreActions: msg({
    message: "More actions",
    comment: "@context: Aria-label for collections page more button",
  }),
  deleteCollection: msg({
    message: "Delete",
    comment: "@context: Delete collection action",
  }),
  confirmDelete: msg({
    message:
      "Delete this collection permanently? Posts inside won't be removed.",
    comment: "@context: Confirm dialog for deleting a collection",
  }),
  cancel: msg({
    message: "Cancel",
    comment: "@context: Button label to dismiss a dialog or action",
  }),
  saved: msg({
    message: "Collection saved.",
    comment: "@context: Toast after saving a collection",
  }),
  saveFailed: msg({
    message: "Couldn't save. Try again in a moment.",
    comment: "@context: Toast when save fails",
  }),
  deleted: msg({
    message: "Collection deleted.",
    comment: "@context: Toast after deleting a collection",
  }),
} as const;

export const getCollectionFormLabels = (t: Translate) => ({
  titleLabel: t(collectionFormMessages.titleLabel),
  titlePlaceholder: t(collectionFormMessages.titlePlaceholder),
  slugLabel: t(collectionFormMessages.slugLabel),
  slugHelp: t(collectionFormMessages.slugHelp),
  slugInvalidHelp: t(collectionFormMessages.slugInvalidHelp),
  slugReservedHelp: t(collectionFormMessages.slugReservedHelp),
  slugTooLongHelp: t(collectionFormMessages.slugTooLongHelp),
  editSlugLabel: t(collectionFormMessages.editSlugLabel),
  resetSlugLabel: t(collectionFormMessages.resetSlugLabel),
  quickHint: t(collectionFormMessages.quickHint),
  quickSubmitLabel: t(collectionFormMessages.quickSubmitLabel),
  createdLabel: t(collectionFormMessages.createdLabel),
  descriptionLabel: t(collectionFormMessages.descriptionLabel),
  descriptionPlaceholder: t(collectionFormMessages.descriptionPlaceholder),
  sortOrderLabel: t(collectionFormMessages.sortOrderLabel),
  sortNewest: t(collectionFormMessages.sortNewest),
  sortOldest: t(collectionFormMessages.sortOldest),
  sortRatingDesc: t(collectionFormMessages.sortRatingDesc),
  submitLabel: t(collectionFormMessages.submitLabel),
  cancelLabel: t(collectionFormMessages.cancelLabel),
});

export const getCollectionMutationLabels = (t: Translate) => ({
  edit: t(collectionMutationMessages.edit),
  moreActions: t(collectionMutationMessages.moreActions),
  deleteCollection: t(collectionMutationMessages.deleteCollection),
  confirmDelete: t(collectionMutationMessages.confirmDelete),
  cancel: t(collectionMutationMessages.cancel),
  saved: t(collectionMutationMessages.saved),
  saveFailed: t(collectionMutationMessages.saveFailed),
  deleted: t(collectionMutationMessages.deleted),
  formLabels: getCollectionFormLabels(t),
});
