/**
 * Operation Types (create/update DTOs)
 */

import type {
  Format,
  Status,
  Visibility,
  SortOrder,
  SystemNavKey,
  TextAttachmentContentFormat,
} from "./constants.js";

export type PostAttachmentInput =
  | {
      type: "media";
      mediaId: string;
      alt?: string;
    }
  | {
      type: "text";
      contentFormat: TextAttachmentContentFormat;
      content: string;
      summary?: string;
    };

export interface TextAttachmentContent {
  id: string;
  type: "text";
  contentFormat: TextAttachmentContentFormat;
  content: string;
  summary: string | null;
  chars: number | null;
}

export interface CreatePost {
  format: Format;
  status?: Status;
  visibility?: Visibility;
  pinned?: boolean;
  featured?: boolean;
  slug?: string;
  path?: string;
  title?: string;
  url?: string;
  body?: string;
  bodyMarkdown?: string;
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
  featured?: boolean;
  slug?: string;
  title?: string | null;
  url?: string | null;
  body?: string | null;
  bodyMarkdown?: string | null;
  quoteText?: string | null;
  rating?: number | null;
  collectionIds?: string[];
  publishedAt?: number;
  mediaIds?: string[];
}

export type CreateNavItem =
  | {
      type: "link";
      label: string;
      url: string;
      position?: string;
    }
  | {
      type: "system";
      systemKey: SystemNavKey;
      position?: string;
    };

export interface UpdateNavItem {
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

export interface UpdateSidebarItem {
  label?: string | null;
}
