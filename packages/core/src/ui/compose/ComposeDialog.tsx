/**
 * Compose Dialog
 *
 * Full-screen compose dialog for quick post creation.
 * Rendered server-side as part of SiteLayout for authenticated users.
 *
 * The Lit Web Component <jant-compose-dialog> handles all form state
 * and rendering. Server provides labels and collections as JSON attributes.
 */

import type { FC } from "hono/jsx";
import type { Collection } from "../../types.js";
import { renderCollectionIcon } from "../../lib/icons.js";
import { useLingui } from "@lingui/react/macro";

export interface ComposeDialogProps {
  collections?: Collection[];
  uploadMaxFileSize?: number;
}

export const ComposeDialog: FC<ComposeDialogProps> = ({
  collections,
  uploadMaxFileSize,
}) => {
  const { t } = useLingui();

  const labels = JSON.stringify({
    cancel: t({ message: "Cancel", comment: "@context: Close compose dialog" }),
    note: t({ message: "Note", comment: "@context: Compose format tab" }),
    link: t({ message: "Link", comment: "@context: Compose format tab" }),
    quote: t({ message: "Quote", comment: "@context: Compose format tab" }),
    saveDraft: t({
      message: "Save as Draft",
      comment: "@context: Header draft button tooltip",
    }),
    saveAsDraft: t({
      message: "Save as draft",
      comment: "@context: More menu - save draft",
    }),
    discard: t({
      message: "Discard",
      comment: "@context: More menu - discard post",
    }),
    titlePlaceholder: t({
      message: "Title",
      comment: "@context: Compose note title placeholder",
    }),
    bodyPlaceholder: t({
      message: "What's on your mind...",
      comment: "@context: Compose body placeholder",
    }),
    urlPlaceholder: t({
      message: "Paste a URL...",
      comment: "@context: Compose link URL placeholder",
    }),
    linkTitlePlaceholder: t({
      message: "Give it a title...",
      comment: "@context: Compose link title placeholder",
    }),
    thoughtsPlaceholder: t({
      message: "Your thoughts (optional)",
      comment: "@context: Compose thoughts placeholder",
    }),
    quotePlaceholder: t({
      message: "Type the quote...",
      comment: "@context: Compose quote text placeholder",
    }),
    authorPlaceholder: t({
      message: "Author (optional)",
      comment: "@context: Compose quote author placeholder",
    }),
    sourcePlaceholder: t({
      message: "Source link (optional)",
      comment: "@context: Compose quote source link placeholder",
    }),
    attachedText: t({
      message: "Text attachment",
      comment: "@context: Attached text panel title",
    }),
    attachedTextPlaceholder: t({
      message:
        "Paste a long article, AI response, or any text...\n\nMarkdown formatting will be preserved.",
      comment: "@context: Attached text placeholder",
    }),
    attachedTextHint: t({
      message: "Supplementary content attached to your post",
      comment: "@context: Attached text panel hint",
    }),
    done: t({
      message: "Done",
      comment: "@context: Close attached text panel",
    }),
    media: t({
      message: "Media",
      comment: "@context: Compose toolbar - media tooltip",
    }),
    rate: t({
      message: "Rate",
      comment: "@context: Compose toolbar - rate tooltip",
    }),
    emoji: t({
      message: "Emoji",
      comment: "@context: Compose toolbar - emoji picker tooltip",
    }),
    title: t({
      message: "Title",
      comment: "@context: Compose toolbar - title tooltip",
    }),
    collection: t({
      message: "Collection",
      comment: "@context: Compose collection selector trigger label",
    }),
    searchCollections: t({
      message: "Search...",
      comment: "@context: Compose collection combobox search placeholder",
    }),
    noCollections: t({
      message: "No matching collections.",
      comment:
        "@context: Compose collection combobox empty state when search has no results",
    }),
    emptyCollections: t({
      message: "Create a collection to get started.",
      comment:
        "@context: Compose collection combobox empty state when no collections exist",
    }),
    post: t({
      message: "Post",
      comment: "@context: Compose button - publish post",
    }),
    addAlt: t({
      message: "+ ALT",
      comment: "@context: Add alt text label under attachment thumbnail",
    }),
    addAltTitle: t({
      message: "Add alt text",
      comment: "@context: Alt text panel title",
    }),
    altPlaceholder: t({
      message: "Describe this for people with visual impairments...",
      comment: "@context: Alt text textarea placeholder",
    }),
    altHint: t({
      message: "Helps screen readers describe the image",
      comment: "@context: Hint text in alt text panel",
    }),
    addMore: t({
      message: "Add",
      comment: "@context: Add more attachments button",
    }),
    uploading: t({
      message: "Uploading...",
      comment: "@context: Toast shown during background upload",
    }),
    published: t({
      message: "Published!",
      comment: "@context: Toast shown after successful deferred publish",
    }),
    view: t({
      message: "View",
      comment: "@context: Toast action button to view the published post",
    }),
    retryAll: t({
      message: "Tap to retry",
      comment:
        "@context: Label on failed upload overlay button, tells user tapping retries the upload",
    }),
    editPost: t({
      message: "Edit post",
      comment: "@context: Compose dialog header title in edit mode",
    }),
    update: t({
      message: "Done",
      comment: "@context: Compose button - update existing post",
    }),
    confirmCloseTitle: t({
      message: "Save to drafts?",
      comment: "@context: Confirm close action sheet title",
    }),
    confirmCloseSubtitle: t({
      message: "Save to drafts to edit and post at a later time.",
      comment: "@context: Confirm close action sheet subtitle",
    }),
    confirmCloseSave: t({
      message: "Save",
      comment: "@context: Confirm close action sheet - save draft button",
    }),
    confirmCloseCancel: t({
      message: "Cancel",
      comment:
        "@context: Confirm close action sheet - cancel and return to editor",
    }),
    confirmCloseDiscard: t({
      message: "Don't save",
      comment: "@context: Confirm close action sheet - discard button",
    }),
    drafts: t({ message: "Drafts", comment: "@context: Drafts panel title" }),
    draftsEmpty: t({
      message: "No drafts yet. Save a draft to find it here.",
      comment: "@context: Drafts panel empty state",
    }),
    deleteDraft: t({
      message: "Delete Draft",
      comment: "@context: Draft item action",
    }),
    draftDeleted: t({
      message: "Draft deleted.",
      comment: "@context: Toast after draft deletion",
    }),
    publishFailedDraft: t({
      message: "Couldn't publish. Saved as draft.",
      comment:
        "@context: Toast when publish fails and post is auto-saved as draft",
    }),
    uploadFailedDraft: t({
      message: "Some uploads failed. Saved as draft.",
      comment:
        "@context: Toast when uploads fail and post is auto-saved as draft",
    }),
    reply: t({
      message: "Reply",
      comment: "@context: Compose button - reply to post",
    }),
    showMore: t({
      message: "Show more",
      comment: "@context: Expand reply context",
    }),
    showLess: t({
      message: "Show less",
      comment: "@context: Collapse reply context",
    }),
    addCollection: t({
      message: "Add Collection",
      comment: "@context: Action to create a new collection from compose",
    }),
    collectionCountLabel: t({
      message: "{name} + {count} more",
      comment:
        "@context: Compose collection trigger label when multiple collections selected. {name} is the first collection name, {count} is how many more",
    }),
    draftRestored: t({
      message: "Draft restored.",
      comment:
        "@context: Toast shown when a local draft is restored on compose open",
    }),
    collectionFormLabels: {
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
    },
  }).replace(/</g, "\\u003c");

  const collectionsJson = JSON.stringify(
    (collections ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      iconHtml: renderCollectionIcon(c.icon, { size: 16 }),
    })),
  ).replace(/</g, "\\u003c");

  return (
    <dialog
      id="compose-dialog"
      class="compose-dialog"
      onclick="event.target === this && this.querySelector('jant-compose-dialog')?.requestClose()"
    >
      <jant-compose-dialog
        collections={collectionsJson}
        labels={labels}
        upload-max-file-size={uploadMaxFileSize ?? 500}
      >
        {/* SSR fallback skeleton */}
        <div class="compose-dialog-inner">
          <div class="compose-dialog-header" />
          <div class="compose-body skel-section-md" />
        </div>
      </jant-compose-dialog>
    </dialog>
  );
};
