/**
 * Entity Types (database-level models)
 */

import type {
  Format,
  Status,
  Visibility,
  CollectionSortOrder,
  NavItemType,
  SystemNavKey,
  MediaKind,
  PathKind,
  SiteStatus,
  SiteDomainKind,
  SiteMemberRole,
} from "./constants.js";

export interface Site {
  id: string;
  key: string;
  status: SiteStatus;
  createdAt: number;
  updatedAt: number;
}

export interface SiteDomain {
  id: string;
  siteId: string;
  host: string;
  pathPrefix: string | null;
  kind: SiteDomainKind;
  redirectToPrimary: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SiteMember {
  siteId: string;
  userId: string;
  role: SiteMemberRole;
  createdAt: number;
  updatedAt: number;
}

export interface Post {
  id: string;
  siteId: string;
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
  publishedAt: number | null;
  lastActivityAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface Media {
  id: string; // TypeID
  siteId: string;
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
  position: string;
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
  position: string;
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
  siteId: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: CollectionSortOrder;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionDirectoryCollection extends Collection {
  postCount: number;
  recentActivityAt: number;
}

export type SidebarItemType = "collection" | "divider" | "link";

export interface SidebarItem {
  id: string;
  siteId: string;
  type: SidebarItemType;
  collectionId: string | null;
  label: string | null;
  url: string | null;
  position: string;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionDirectoryItem {
  id: string;
  type: "collection" | "divider" | "link";
  label?: string | null;
  url?: string | null;
  collection?: CollectionDirectoryCollection;
}

export interface CollectionsDirectoryData {
  collections: CollectionDirectoryCollection[];
  items: CollectionDirectoryItem[];
  sidebarItems: SidebarItem[];
}

export interface PostCollection {
  siteId: string;
  postId: string;
  collectionId: string;
}

export interface NavItem {
  id: string;
  siteId: string;
  type: NavItemType;
  systemKey?: SystemNavKey;
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
  siteId: string;
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
  siteId: string;
  key: string;
  value: string;
  updatedAt: number;
}

export interface ApiToken {
  id: string;
  siteId: string;
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
