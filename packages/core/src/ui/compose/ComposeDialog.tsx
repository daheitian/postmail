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
import { useLingui } from "@lingui/react/macro";
import { getCollectionFormLabels } from "../shared/collection-management-labels.js";

export interface ComposeDialogProps {
  collections?: Collection[];
  uploadMaxFileSize?: number;
}

export interface ComposeFormProps extends ComposeDialogProps {
  pageMode?: boolean;
  closeHref?: string;
  autoRestoreDraft?: boolean;
}

export const ComposeForm: FC<ComposeFormProps> = ({
  collections,
  uploadMaxFileSize,
  pageMode = false,
  closeHref,
  autoRestoreDraft = false,
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
    urlInvalid: t({
      message: "Enter a valid URL starting with http://, https://, or mailto:.",
      comment: "@context: Compose URL field error message",
    }),
    linkUrlRequired: t({
      message: "Add a URL before posting this link.",
      comment: "@context: Compose link URL required error",
    }),
    linkTitleRequired: t({
      message: "Add a title before posting this link.",
      comment: "@context: Compose link title required error",
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
    fullscreen: t({
      message: "Fullscreen",
      comment: "@context: Compose dialog - open fullscreen editor",
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
      message: "No collections match that search. Try a different name.",
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
    removeAttachment: t({
      message: "Remove attachment",
      comment: "@context: Button to remove an uploaded attachment in compose",
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
    confirmAttachedTitle: t({
      message: "Save text attachment?",
      comment:
        "@context: Confirm action sheet title when closing text attachment editor",
    }),
    confirmAttachedSubtitle: t({
      message:
        "Save these changes to the text attachment, discard them, or keep editing.",
      comment:
        "@context: Confirm action sheet subtitle when closing text attachment editor",
    }),
    confirmAttachedSave: t({
      message: "Save",
      comment:
        "@context: Confirm action sheet - save text attachment changes button",
    }),
    confirmAttachedDiscard: t({
      message: "Don't save",
      comment:
        "@context: Confirm action sheet - discard text attachment changes button",
    }),
    confirmEditTitle: t({
      message: "You have unsaved changes",
      comment:
        "@context: Confirm close action sheet title when editing a published post",
    }),
    confirmEditSubtitle: t({
      message: "Do you want to publish your changes or discard them?",
      comment:
        "@context: Confirm close action sheet subtitle when editing a published post",
    }),
    confirmEditPublish: t({
      message: "Publish",
      comment:
        "@context: Confirm close action sheet - publish update button for editing published post",
    }),
    confirmEditDiscard: t({
      message: "Discard",
      comment:
        "@context: Confirm close action sheet - discard changes button for editing published post",
    }),
    discardChangesConfirm: t({
      message: "Discard changes?",
      comment:
        "@context: Confirm dialog shown before discarding attached text edits",
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
    publishHideFromLatest: t({
      message: "Hide from Latest",
      comment:
        "@context: Compose dropdown option for hiding a post from the Latest view",
    }),
    publishPrivate: t({
      message: "Post as Private",
      comment:
        "@context: Compose dropdown option - publish post visible only when logged in",
    }),
    publishSettings: t({
      message: "Publish settings",
      comment: "@context: Compose publish settings panel title",
    }),
    publishVisibilityLabel: t({
      message: "Visibility",
      comment: "@context: Compose publish settings section label",
    }),
    publishVisibilityPublic: t({
      message: "Public",
      comment: "@context: Compose publish settings visibility option",
    }),
    publishVisibilityPublicHint: t({
      message: "Appears in Latest.",
      comment:
        "@context: Compose publish settings help text for public visibility",
    }),
    publishVisibilityHiddenFromLatest: t({
      message: "Hidden from Latest",
      comment: "@context: Compose publish settings visibility option",
    }),
    publishVisibilityHiddenFromLatestHint: t({
      message:
        "Doesn't appear in Latest. Still appears in collections you add it to.",
      comment:
        "@context: Compose publish settings help text for posts hidden from Latest",
    }),
    publishVisibilityPrivate: t({
      message: "Private",
      comment: "@context: Compose publish settings visibility option",
    }),
    publishVisibilityPrivateHint: t({
      message: "Only visible when signed in.",
      comment:
        "@context: Compose publish settings help text for private visibility",
    }),
    publishSlugLabel: t({
      message: "Custom link",
      comment: "@context: Compose publish settings slug section label",
    }),
    publishSlugPlaceholder: t({
      message: "your-post-link",
      comment: "@context: Compose publish settings slug input placeholder",
    }),
    publishSlugHint: t({
      message: "Leave blank to generate one automatically.",
      comment: "@context: Compose publish settings slug help text",
    }),
    publishSlugAuto: t({
      message: "Generate automatically",
      comment:
        "@context: Compose publish settings slug summary when no custom slug is set",
    }),
    publishSlugReset: t({
      message: "Reset link",
      comment:
        "@context: Compose custom slug action that clears the manual slug and falls back to automatic generation",
    }),
    publishSlugSuggested: t({
      message: "Suggested link",
      comment:
        "@context: Compose custom slug helper label for the suggested slug",
    }),
    publishSlugGenerating: t({
      message: "Generating a link...",
      comment:
        "@context: Compose custom slug helper while generating a suggested slug",
    }),
    publishSlugChecking: t({
      message: "Checking link...",
      comment:
        "@context: Compose custom slug helper while checking whether a manual slug is available",
    }),
    publishSlugTaken: t({
      message: "This link is already in use. Choose something else.",
      comment:
        "@context: Compose custom slug validation error when the entered slug is already taken",
    }),
    publishSlugInvalid: t({
      message: "Use lowercase letters, numbers, and hyphens only.",
      comment:
        "@context: Compose custom slug validation error for invalid characters",
    }),
    publishSlugReserved: t({
      message: "This link is reserved. Choose something else.",
      comment:
        "@context: Compose custom slug validation error for reserved paths",
    }),
    postHiddenFromLatest: t({
      message: "Post hidden",
      comment: "@context: Compose publish button for posts hidden from Latest",
    }),
    postPrivately: t({
      message: "Post privately",
      comment: "@context: Compose publish button for private visibility",
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
      message: "%name% + %count% more",
      comment:
        "@context: Compose collection trigger label when multiple collections selected. %name% is the first collection name, %count% is how many more",
    }),
    draftRestored: t({
      message: "Draft restored.",
      comment:
        "@context: Toast shown when a local draft is restored on compose open",
    }),
    collectionFormLabels: getCollectionFormLabels(t),
  }).replace(/</g, "\\u003c");

  const collectionsJson = JSON.stringify(
    (collections ?? []).map((c) => ({
      id: c.id,
      title: c.title,
    })),
  ).replace(/</g, "\\u003c");

  return (
    <jant-compose-dialog
      collections={collectionsJson}
      labels={labels}
      upload-max-file-size={uploadMaxFileSize ?? 500}
      {...(pageMode ? { "page-mode": "" } : {})}
      {...(closeHref ? { "close-href": closeHref } : {})}
      {...(autoRestoreDraft ? { "auto-restore-draft": "" } : {})}
    >
      {/* SSR fallback skeleton */}
      <div class="compose-dialog-inner">
        <div class="compose-dialog-header" />
        <div class="compose-body skel-section-md" />
      </div>
    </jant-compose-dialog>
  );
};

export const ComposeDialog: FC<ComposeDialogProps> = ({
  collections,
  uploadMaxFileSize,
}) => {
  return (
    <dialog id="compose-dialog" class="compose-dialog">
      <ComposeForm
        collections={collections}
        uploadMaxFileSize={uploadMaxFileSize}
      />
    </dialog>
  );
};
