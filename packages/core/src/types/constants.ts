/**
 * Content Type Constants
 */

export const FORMATS = ["note", "link", "quote"] as const;
export type Format = (typeof FORMATS)[number];

export const STATUSES = ["draft", "published"] as const;
export type Status = (typeof STATUSES)[number];

export const SORT_ORDERS = [
  "newest",
  "oldest",
  "rating_desc",
  "rating_asc",
] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const NAV_ITEM_TYPES = ["page", "link"] as const;
export type NavItemType = (typeof NAV_ITEM_TYPES)[number];

export const MAX_MEDIA_ATTACHMENTS = 20;
export const MAX_PINNED_POSTS = 3;

export const STORAGE_DRIVERS = ["r2", "s3"] as const;
export type StorageDriver = (typeof STORAGE_DRIVERS)[number];
