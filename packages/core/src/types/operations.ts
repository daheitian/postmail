/**
 * Operation Types (create/update DTOs)
 */

import type {
  Format,
  Status,
  Visibility,
  CollectionSortOrder,
  SystemNavKey,
  NavItemPlacement,
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
  quietReply?: boolean;
  publishedAt?: number;
  attachments?: PostAttachmentInput[];
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
  attachments?: PostAttachmentInput[];
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
  placement?: NavItemPlacement;
  position?: string;
}

export interface CreateCollection {
  slug: string;
  title: string;
  description?: string;
  sortOrder?: CollectionSortOrder;
}

export interface UpdateCollection {
  slug?: string;
  title?: string;
  description?: string | null;
  sortOrder?: CollectionSortOrder;
}

export type CreateCollectionDirectoryEntry =
  | {
      type: "collection";
      collectionId: string;
    }
  | {
      type: "divider";
      label?: string | null;
    }
  | {
      type: "link";
      label: string;
      url: string;
    };

export interface UpdateCollectionDirectoryEntry {
  label?: string | null;
  url?: string;
}
