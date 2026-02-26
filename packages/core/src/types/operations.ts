/**
 * Operation Types (create/update DTOs)
 */

import type {
  Format,
  Status,
  Visibility,
  SortOrder,
  NavItemType,
} from "./constants.js";

export interface CreatePost {
  format: Format;
  status?: Status;
  visibility?: Visibility;
  pinned?: boolean;
  path?: string;
  title?: string;
  url?: string;
  body?: string;
  quoteText?: string;
  rating?: number;
  collectionIds?: number[];
  replyToId?: number;
  publishedAt?: number;
  mediaIds?: string[];
}

export interface UpdatePost {
  format?: Format;
  status?: Status;
  visibility?: Visibility;
  pinned?: boolean;
  path?: string | null;
  title?: string | null;
  url?: string | null;
  body?: string | null;
  quoteText?: string | null;
  rating?: number | null;
  collectionIds?: number[];
  publishedAt?: number;
  mediaIds?: string[];
}

export interface CreatePage {
  slug: string;
  title?: string;
  body?: string;
  status?: Status;
}

export interface UpdatePage {
  slug?: string;
  title?: string | null;
  body?: string | null;
  status?: Status;
}

export interface CreateNavItem {
  type: NavItemType;
  label: string;
  url: string;
  pageId?: number;
  position?: number;
}

export interface UpdateNavItem {
  type?: NavItemType;
  label?: string;
  url?: string;
  pageId?: number | null;
  position?: number;
}

export interface CreateCollection {
  slug: string;
  title: string;
  description?: string;
  icon?: string;
  sortOrder?: SortOrder;
  position?: number;
}

export interface UpdateCollection {
  slug?: string;
  title?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: SortOrder;
  position?: number;
}
