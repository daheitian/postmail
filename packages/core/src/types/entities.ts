/**
 * Entity Types (database-level models)
 */

import type {
  Format,
  Status,
  Visibility,
  SortOrder,
  NavItemType,
} from "./constants.js";

export interface Post {
  id: number;
  format: Format;
  status: Status;
  visibility: Visibility;
  pinned: number; // 0 | 1
  path: string | null;
  title: string | null;
  url: string | null;
  body: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  quoteText: string | null;
  summary: string | null;
  rating: number | null;
  replyToId: number | null;
  threadId: number | null;
  deletedAt: number | null;
  publishedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface Page {
  id: number;
  slug: string;
  title: string | null;
  body: string | null;
  bodyHtml: string | null;
  status: Status;
  createdAt: number;
  updatedAt: number;
}

export interface Media {
  id: string; // UUIDv7
  postId: number | null;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  provider: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  position: number;
  blurhash: string | null;
  posterKey: string | null;
  createdAt: number;
}

export interface MediaAttachment {
  id: string;
  url: string;
  previewUrl: string;
  alt: string | null;
  blurhash: string | null;
  posterUrl: string | null;
  width: number | null;
  height: number | null;
  position: number;
  mimeType: string;
}

export interface PostWithMedia extends Post {
  mediaAttachments: MediaAttachment[];
}

export interface Collection {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  sortOrder: SortOrder;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionDivider {
  id: number;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface PostCollection {
  postId: number;
  collectionId: number;
}

export interface NavItem {
  id: number;
  type: NavItemType;
  label: string;
  url: string;
  pageId: number | null;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface Redirect {
  id: number;
  fromPath: string;
  toPath: string;
  type: 301 | 302;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: number;
}
