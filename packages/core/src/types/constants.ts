/**
 * Content Type Constants
 */

export const FORMATS = ["note", "link", "quote"] as const;
export type Format = (typeof FORMATS)[number];

export const STATUSES = ["draft", "published"] as const;
export type Status = (typeof STATUSES)[number];

export const VISIBILITIES = ["public", "unlisted", "private"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const SORT_ORDERS = [
  "newest",
  "oldest",
  "rating_desc",
  "rating_asc",
] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const NAV_ITEM_TYPES = ["link", "system"] as const;
export type NavItemType = (typeof NAV_ITEM_TYPES)[number];

export const SYSTEM_NAV_KEY_VALUES = [
  "rss",
  "settings",
  "collections",
  "archive",
] as const;
export type SystemNavKey = (typeof SYSTEM_NAV_KEY_VALUES)[number];

export const SYSTEM_NAV_KEYS = {
  rss: { defaultLabel: "RSS", url: "/feed" },
  settings: { defaultLabel: "Settings", url: "/settings" },
  collections: { defaultLabel: "Collections", url: "/c" },
  archive: { defaultLabel: "Archive", url: "/archive" },
} as const satisfies Record<
  SystemNavKey,
  { defaultLabel: string; url: string }
>;

export const MAX_MEDIA_ATTACHMENTS = 20;
export const MAX_PINNED_POSTS = 3;

export const MEDIA_KINDS = [
  "image",
  "video",
  "audio",
  "text",
  "document",
] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const STORAGE_DRIVERS = ["r2", "s3"] as const;
export type StorageDriver = (typeof STORAGE_DRIVERS)[number];

export const PATH_KINDS = ["slug", "alias", "redirect"] as const;
export type PathKind = (typeof PATH_KINDS)[number];
