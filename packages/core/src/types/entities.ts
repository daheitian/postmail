/**
 * Entity Types (database-level models)
 */

import type {
  Format,
  Status,
  Visibility,
  SortOrder,
  NavItemType,
  MediaKind,
  PathKind,
} from "./constants.js";

export interface Post {
  id: string;
  format: Format;
  status: Status;
  visibility: Visibility;
  pinnedAt: number | null;
  featuredAt: number | null;
  slug: string;
  title: string | null;
  url: string | null;
  body: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  quoteText: string | null;
  summary: string | null;
  rating: number | null;
  replyToId: string | null;
  threadId: string;
  deletedAt: number | null;
  publishedAt: number;
  lastActivityAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface Media {
  id: string; // UUIDv7
  postId: string | null;
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
  waveform: string | null;
  posterKey: string | null;
  summary: string | null;
  chars: number | null;
  mediaKind: MediaKind;
  createdAt: number;
  updatedAt: number;
}

export interface MediaAttachment {
  id: string;
  url: string;
  previewUrl: string;
  alt: string | null;
  blurhash: string | null;
  waveform: string | null;
  posterUrl: string | null;
  width: number | null;
  height: number | null;
  position: number;
  mimeType: string;
  originalName: string;
  size: number;
  summary: string | null;
  chars: number | null;
}

export interface PostWithMedia extends Post {
  mediaAttachments: MediaAttachment[];
}

export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  sortOrder: SortOrder;
  createdAt: number;
  updatedAt: number;
}

export type SidebarItemType = "collection" | "divider";

export interface SidebarItem {
  id: string;
  type: SidebarItemType;
  collectionId: string | null;
  position: string;
  createdAt: number;
  updatedAt: number;
}

export interface PostCollection {
  postId: string;
  collectionId: string;
}

export interface NavItem {
  id: string;
  type: NavItemType;
  label: string;
  url: string;
  position: string;
  createdAt: number;
  updatedAt: number;
}

export interface CustomUrl {
  id: string;
  path: string;
  targetType: "post" | "collection" | "redirect";
  targetId: string | null;
  toPath: string | null;
  redirectType: 301 | 302 | null;
  createdAt: number;
}

export interface PathRecord {
  id: string;
  path: string;
  kind: PathKind;
  postId: string | null;
  collectionId: string | null;
  redirectToPath: string | null;
  redirectType: 301 | 302 | null;
  createdAt: number;
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: number;
}

export interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/** Latest-reply context for a thread root, used in timeline display */
export interface ThreadTimelineContext {
  latestReply: Post;
  /** Parent of latestReply, only if it's not the root */
  parentReply: Post | null;
  totalReplyCount: number;
}
