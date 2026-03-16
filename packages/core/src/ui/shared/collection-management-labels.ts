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
    message: "Slug",
    comment: "@context: Collection form field",
  }),
  slugHelp: msg({
    message:
      "This becomes the end of the collection link. If the title uses Chinese, Japanese, or Korean, we'll generate it for you.",
    comment: "@context: Collection path help text",
  }),
  descriptionLabel: msg({
    message: "Description (optional)",
    comment: "@context: Collection form field",
  }),
  descriptionPlaceholder: msg({
    message: "What's this collection about?",
    comment: "@context: Collection description placeholder",
  }),
  featuredIconsLabel: msg({
    message: "Featured",
    comment: "@context: Label for the default featured icon picker view",
  }),
  browseAllIconsLabel: msg({
    message: "Browse all icons",
    comment: "@context: Label for the full icon browser view",
  }),
  showMoreIcons: msg({
    message: "Show more icons",
    comment:
      "@context: Button to expand the collection icon picker into category browsing",
  }),
  showLessIcons: msg({
    message: "Show less",
    comment:
      "@context: Button to collapse the collection icon picker back to featured icons",
  }),
  removeIcon: msg({
    message: "Remove",
    comment: "@context: Button to remove icon",
  }),
  iconsTab: msg({
    message: "Icons",
    comment: "@context: Icon picker tab label",
  }),
  emojisTab: msg({
    message: "Emojis",
    comment: "@context: Emoji picker tab label",
  }),
  searchIconsPlaceholder: msg({
    message: "Search icons...",
    comment: "@context: Icon picker search placeholder",
  }),
  searchEmojisPlaceholder: msg({
    message: "Search emojis...",
    comment: "@context: Emoji picker search placeholder",
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
  sortRatingAsc: msg({
    message: "Lowest rated",
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
    message: "Saved",
    comment: "@context: Toast after saving a collection",
  }),
  saveFailed: msg({
    message: "Couldn't save. Try again in a moment.",
    comment: "@context: Toast when save fails",
  }),
  deleted: msg({
    message: "Deleted",
    comment: "@context: Toast after deleting a collection",
  }),
} as const;

export const getCollectionFormLabels = (t: Translate) => ({
  titleLabel: t(collectionFormMessages.titleLabel),
  titlePlaceholder: t(collectionFormMessages.titlePlaceholder),
  slugLabel: t(collectionFormMessages.slugLabel),
  slugHelp: t(collectionFormMessages.slugHelp),
  descriptionLabel: t(collectionFormMessages.descriptionLabel),
  descriptionPlaceholder: t(collectionFormMessages.descriptionPlaceholder),
  featuredIconsLabel: t(collectionFormMessages.featuredIconsLabel),
  browseAllIconsLabel: t(collectionFormMessages.browseAllIconsLabel),
  showMoreIcons: t(collectionFormMessages.showMoreIcons),
  showLessIcons: t(collectionFormMessages.showLessIcons),
  removeIcon: t(collectionFormMessages.removeIcon),
  iconsTab: t(collectionFormMessages.iconsTab),
  emojisTab: t(collectionFormMessages.emojisTab),
  searchIconsPlaceholder: t(collectionFormMessages.searchIconsPlaceholder),
  searchEmojisPlaceholder: t(collectionFormMessages.searchEmojisPlaceholder),
  sortOrderLabel: t(collectionFormMessages.sortOrderLabel),
  sortNewest: t(collectionFormMessages.sortNewest),
  sortOldest: t(collectionFormMessages.sortOldest),
  sortRatingDesc: t(collectionFormMessages.sortRatingDesc),
  sortRatingAsc: t(collectionFormMessages.sortRatingAsc),
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
