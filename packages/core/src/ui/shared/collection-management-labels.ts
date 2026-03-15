type Translate = (descriptor: { message: string; comment: string }) => string;

export const getCollectionFormLabels = (t: Translate) => ({
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
  removeIcon: t({
    message: "Remove",
    comment: "@context: Button to remove icon",
  }),
  iconsTab: t({
    message: "Icons",
    comment: "@context: Icon picker tab label",
  }),
  emojisTab: t({
    message: "Emojis",
    comment: "@context: Emoji picker tab label",
  }),
  searchIconsPlaceholder: t({
    message: "Search icons...",
    comment: "@context: Icon picker search placeholder",
  }),
  searchEmojisPlaceholder: t({
    message: "Search emojis...",
    comment: "@context: Emoji picker search placeholder",
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
  submitLabel: t({
    message: "Save",
    comment: "@context: Button to save collection",
  }),
  cancelLabel: t({
    message: "Cancel",
    comment: "@context: Button to cancel form",
  }),
});

export const getCollectionMutationLabels = (t: Translate) => ({
  edit: t({
    message: "Edit",
    comment: "@context: Per-collection edit action",
  }),
  moreActions: t({
    message: "More actions",
    comment: "@context: Aria-label for collections page more button",
  }),
  deleteCollection: t({
    message: "Delete",
    comment: "@context: Delete collection action",
  }),
  confirmDelete: t({
    message:
      "Delete this collection permanently? Posts inside won't be removed.",
    comment: "@context: Confirm dialog for deleting a collection",
  }),
  saved: t({
    message: "Saved",
    comment: "@context: Toast after saving a collection",
  }),
  saveFailed: t({
    message: "Couldn't save. Try again in a moment.",
    comment: "@context: Toast when save fails",
  }),
  deleted: t({
    message: "Deleted",
    comment: "@context: Toast after deleting a collection",
  }),
  formLabels: getCollectionFormLabels(t),
});
