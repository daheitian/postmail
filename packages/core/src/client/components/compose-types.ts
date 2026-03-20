/**
 * Compose Dialog Types
 *
 * Shared type definitions for jant-compose-dialog and jant-compose-editor
 * Lit Web Components, and the compose bridge script.
 */

import type { JSONContent } from "@tiptap/core";
import type { CollectionFormLabels } from "./collection-types.js";

export type ComposeFormat = "note" | "link" | "quote";

export interface ComposeAttachment {
  clientId: string;
  file: File;
  previewUrl: string;
  status: "pending" | "processing" | "uploading" | "done" | "error";
  progress: number | null;
  mediaId: string | null;
  alt: string;
  error: string | null;
  /** Text content preview for text files (first ~100 chars) */
  summary: string | null;
  /** Character count of text content */
  chars: number | null;
}

export interface AttachedTextItem {
  clientId: string;
  bodyJson: JSONContent | null;
  /** Pre-rendered HTML from TipTap, used for preview on the public page */
  bodyHtml: string;
  summary: string;
  /** Set for already-persisted text media items (edit mode) */
  mediaId?: string;
  /** Snapshot from the persisted version, used to avoid rewriting unchanged text attachments */
  originalBodyJson?: JSONContent | null;
}

export interface DraftItem {
  id: string;
  format: ComposeFormat;
  title: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  url: string | null;
  quoteText: string | null;
  replyToId: string | null;
  updatedAt: number;
  mediaAttachments: {
    id: string;
    previewUrl: string;
    alt: string | null;
    mimeType: string;
  }[];
}

export interface LocalDraft {
  format: ComposeFormat;
  title: string;
  bodyJson: JSONContent | null;
  url: string;
  quoteText: string;
  quoteAuthor: string;
  slug: string;
  visibility: ComposeVisibility;
  rating: number;
  showTitle: boolean;
  showRating: boolean;
  collectionIds: string[];
  replyToId: string | null;
  attachedTexts: Array<{
    clientId: string;
    bodyJson: JSONContent | null;
    bodyHtml: string;
    summary: string;
  }>;
  attachmentOrder?: string[];
  savedAt: number;
}

export interface ComposeLabels {
  cancel: string;
  note: string;
  link: string;
  quote: string;
  saveDraft: string;
  saveAsDraft: string;
  discard: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
  urlPlaceholder: string;
  urlInvalid: string;
  linkUrlRequired: string;
  linkTitleRequired: string;
  linkTitlePlaceholder: string;
  thoughtsPlaceholder: string;
  quotePlaceholder: string;
  authorPlaceholder: string;
  sourcePlaceholder: string;
  attachedText: string;
  attachedTextPlaceholder: string;
  attachedTextHint: string;
  done: string;
  media: string;
  rate: string;
  emoji: string;
  title: string;
  fullscreen: string;
  collection: string;
  searchCollections: string;
  noCollections: string;
  emptyCollections: string;
  post: string;
  addAlt: string;
  addAltTitle: string;
  altPlaceholder: string;
  altHint: string;
  addMore: string;
  uploading: string;
  published: string;
  view: string;
  retryAll: string;
  editPost: string;
  update: string;
  confirmCloseTitle: string;
  confirmCloseSubtitle: string;
  confirmCloseSave: string;
  confirmCloseCancel: string;
  confirmCloseDiscard: string;
  confirmAttachedTitle: string;
  confirmAttachedSubtitle: string;
  confirmAttachedSave: string;
  confirmAttachedDiscard: string;
  confirmEditTitle: string;
  confirmEditSubtitle: string;
  confirmEditPublish: string;
  confirmEditDiscard: string;
  discardChangesConfirm: string;
  drafts: string;
  draftsEmpty: string;
  deleteDraft: string;
  draftDeleted: string;
  publishFailedDraft: string;
  uploadFailedDraft: string;
  addCollection: string;
  collectionCountLabel: string;
  draftRestored: string;
  reply: string;
  publishHideFromLatest: string;
  publishPrivate: string;
  publishSettings: string;
  publishVisibilityLabel: string;
  publishVisibilityPublic: string;
  publishVisibilityPublicHint: string;
  publishVisibilityHiddenFromLatest: string;
  publishVisibilityHiddenFromLatestHint: string;
  publishVisibilityPrivate: string;
  publishVisibilityPrivateHint: string;
  publishSlugLabel: string;
  publishSlugPlaceholder: string;
  publishSlugHint: string;
  publishSlugAuto: string;
  publishSlugReset: string;
  publishSlugSuggested: string;
  publishSlugGenerating: string;
  publishSlugChecking: string;
  publishSlugTaken: string;
  publishSlugInvalid: string;
  publishSlugReserved: string;
  postHiddenFromLatest: string;
  postPrivately: string;
  showMore: string;
  showLess: string;
  collectionFormLabels: CollectionFormLabels;
}

export type ComposeVisibility = "public" | "latest_hidden" | "private";

export type ComposeSubmitAttachment =
  | {
      type: "media";
      clientId: string;
      mediaId: string | null;
      alt?: string;
    }
  | {
      type: "text";
      clientId: string;
      bodyJson: JSONContent;
      summary: string;
      mediaId?: string;
      originalBodyJson?: JSONContent | null;
    };

export interface ComposeSubmitDetail {
  format: ComposeFormat;
  title: string;
  body: string;
  url: string;
  quoteText: string;
  quoteAuthor: string;
  status: "published" | "draft";
  visibility?: ComposeVisibility;
  slug?: string;
  rating: number;
  collectionIds: string[];
  attachments: ComposeSubmitAttachment[];
  editPostId?: string;
  replyToId?: string;
  replyThreadRootId?: string;
  replyRefreshKind?: "timeline-item" | "post-card" | "post-view";
  replyRefreshId?: string;
}

export interface ComposeCollection {
  id: string;
  title: string;
}
