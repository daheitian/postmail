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
}

export interface DraftItem {
  sqid: string;
  format: ComposeFormat;
  title: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  url: string | null;
  quoteText: string | null;
  updatedAt: number;
  mediaAttachments: {
    id: string;
    previewUrl: string;
    alt: string | null;
    mimeType: string;
  }[];
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
  drafts: string;
  draftsEmpty: string;
  deleteDraft: string;
  draftDeleted: string;
  addCollection: string;
  collectionFormLabels: CollectionFormLabels;
}

export interface ComposeSubmitDetail {
  format: ComposeFormat;
  title: string;
  body: string;
  url: string;
  quoteText: string;
  quoteAuthor: string;
  status: "published" | "draft";
  rating: number;
  collectionIds: number[];
  mediaIds: string[];
  mediaAlts: Record<string, string>;
  attachedTexts: AttachedTextItem[];
  /** Interleaved order of media clientIds + text clientIds */
  attachmentOrder: string[];
  /** clientId → mediaId for already-uploaded file attachments (captured at submit time) */
  mediaClientMap: Record<string, string>;
  editPostId?: string;
}

export interface ComposeCollection {
  id: number;
  title: string;
  iconHtml: string;
}
