/**
 * Shared type definitions for the dashboard post form Lit component.
 */

export type PostFormat = "note" | "link" | "quote";
export type PostStatus = "published" | "draft";
export type PostVisibility = "public" | "featured" | "unlisted";

export interface PostFormLabels {
  formatLabel: string;
  noteOption: string;
  linkOption: string;
  quoteOption: string;
  titleLabel: string;
  titlePlaceholder: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  urlLabel: string;
  urlPlaceholder: string;
  quoteTextLabel: string;
  quoteTextPlaceholder: string;
  mediaLabel: string;
  mediaAddButton: string;
  mediaRemoveButton: string;
  mediaEmptyLabel: string;
  statusLabel: string;
  statusPublished: string;
  statusDraft: string;
  visibilityLabel: string;
  visibilityPublic: string;
  visibilityFeatured: string;
  visibilityUnlisted: string;
  pinnedLabel: string;
  collectionsLabel: string;
  submitLabel: string;
  cancelLabel: string;
  mediaDialogTitle: string;
  mediaDialogDone: string;
  mediaDialogLoading: string;
  submitSuccessMessage: string;
  submitErrorMessage: string;
}

export interface PostFormInitial {
  format: PostFormat;
  title: string;
  body: string;
  url: string;
  quoteText: string;
  status: PostStatus;
  visibility: PostVisibility;
  pinned: boolean;
  rating: number;
  collectionIds: number[];
  mediaIds: string[];
}

export interface PostCollectionOption {
  id: number;
  title: string;
  icon?: string | null;
  iconHtml?: string | null;
}

export interface PostMediaItem {
  id: string;
  thumbUrl: string;
  alt: string;
}

export interface PostSubmitDetail {
  endpoint: string;
  isEdit: boolean;
  data: {
    format: PostFormat;
    title?: string;
    body?: string;
    status: PostStatus;
    visibility: PostVisibility;
    pinned: boolean;
    url?: string;
    quoteText?: string;
    rating?: number;
    collectionIds: number[];
    mediaIds: string[];
  };
  messages: {
    success: string;
    error: string;
  };
}
