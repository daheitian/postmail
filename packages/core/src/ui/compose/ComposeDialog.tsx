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
      message: "Attached Text",
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
    score: t({
      message: "Score",
      comment: "@context: Compose toolbar - score tooltip",
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
      comment: "@context: Compose collection combobox empty state",
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
      onclick="event.target === this && this.close()"
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
