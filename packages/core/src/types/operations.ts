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
  slug?: string;
  title?: string;
  url?: string;
  body?: string;
  quoteText?: string;
  rating?: number;
  collectionIds?: string[];
  replyToId?: string;
  publishedAt?: number;
  mediaIds?: string[];
}

export interface UpdatePost {
  format?: Format;
  status?: Status;
  visibility?: Visibility;
  pinned?: boolean;
  slug?: string;
  title?: string | null;
  url?: string | null;
  body?: string | null;
  quoteText?: string | null;
  rating?: number | null;
  collectionIds?: string[];
  publishedAt?: number;
  mediaIds?: string[];
}

export interface CreateNavItem {
  type: NavItemType;
  label: string;
  url: string;
  position?: string;
}

export interface UpdateNavItem {
  type?: NavItemType;
  label?: string;
  url?: string;
  position?: string;
}

export interface CreateCollection {
  slug: string;
  title: string;
  description?: string;
  icon?: string;
  sortOrder?: SortOrder;
}

export interface UpdateCollection {
  slug?: string;
  title?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: SortOrder;
}
