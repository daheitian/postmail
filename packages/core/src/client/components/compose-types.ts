/**
 * Compose Dialog Types
 *
 * Shared type definitions for jant-compose-dialog and jant-compose-editor
 * Lit Web Components, and the compose bridge script.
 */

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
}

export interface AttachedTextItem {
  clientId: string;
  text: string;
  summary: string;
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
  editPostId?: string;
}

export interface ComposeCollection {
  id: number;
  title: string;
  iconHtml: string;
}
