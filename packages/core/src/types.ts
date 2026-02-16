/**
 * Jant Type Definitions (v2)
 */

// =============================================================================
// Content Types
// =============================================================================

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

// =============================================================================
// Cloudflare Bindings
// =============================================================================

export interface Bindings {
  DB: D1Database;
  R2?: R2Bucket;
  SITE_URL: string;
  AUTH_SECRET?: string;
  R2_PUBLIC_URL?: string;
  IMAGE_TRANSFORM_URL?: string;
  DEMO_EMAIL?: string;
  DEMO_PASSWORD?: string;
  // Timeline
  PAGE_SIZE?: string;
  // Site configuration (optional - can be overridden in DB)
  SITE_NAME?: string;
  SITE_DESCRIPTION?: string;
  SITE_LANGUAGE?: string;
  // S3-compatible storage (alternative to R2)
  STORAGE_DRIVER?: string;
  S3_ENDPOINT?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_REGION?: string;
  S3_PUBLIC_URL?: string;
}

// =============================================================================
// Configuration System
// =============================================================================

/**
 * Configuration Registry - Single Source of Truth
 *
 * All available configuration fields with their metadata.
 * Add new fields here, and they'll automatically work everywhere.
 *
 * Priority logic:
 * - envOnly: false -> User-configurable (DB > ENV > Default)
 * - envOnly: true -> Environment-only (ENV > Default)
 */
export const CONFIG_FIELDS = {
  // User-configurable (can be modified in dashboard)
  SITE_NAME: {
    defaultValue: "Jant",
    envOnly: false,
  },
  SITE_DESCRIPTION: {
    defaultValue: "A microblog powered by Jant",
    envOnly: false,
  },
  SITE_LANGUAGE: {
    defaultValue: "en",
    envOnly: false,
  },

  // Environment-only (deployment/infrastructure config)
  SITE_URL: {
    defaultValue: "",
    envOnly: true,
  },
  AUTH_SECRET: {
    defaultValue: "",
    envOnly: true,
  },
  R2_PUBLIC_URL: {
    defaultValue: "",
    envOnly: true,
  },
  IMAGE_TRANSFORM_URL: {
    defaultValue: "",
    envOnly: true,
  },
  DEMO_EMAIL: {
    defaultValue: "",
    envOnly: true,
  },
  DEMO_PASSWORD: {
    defaultValue: "",
    envOnly: true,
  },
  PAGE_SIZE: {
    defaultValue: "20",
    envOnly: true,
  },
  STORAGE_DRIVER: {
    defaultValue: "r2",
    envOnly: true,
  },
  S3_ENDPOINT: {
    defaultValue: "",
    envOnly: true,
  },
  S3_BUCKET: {
    defaultValue: "",
    envOnly: true,
  },
  S3_ACCESS_KEY_ID: {
    defaultValue: "",
    envOnly: true,
  },
  S3_SECRET_ACCESS_KEY: {
    defaultValue: "",
    envOnly: true,
  },
  S3_REGION: {
    defaultValue: "auto",
    envOnly: true,
  },
  S3_PUBLIC_URL: {
    defaultValue: "",
    envOnly: true,
  },
} as const;

export type ConfigKey = keyof typeof CONFIG_FIELDS;

// =============================================================================
// Entity Types
// =============================================================================

export interface Post {
  id: number;
  format: Format;
  status: Status;
  featured: number; // 0 | 1
  pinned: number; // 0 | 1
  path: string | null;
  title: string | null;
  url: string | null;
  body: string | null;
  bodyHtml: string | null;
  quoteText: string | null;
  rating: number | null;
  collectionId: number | null;
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
  createdAt: number;
}

export interface MediaAttachment {
  id: string;
  url: string;
  previewUrl: string;
  alt: string | null;
  blurhash: string | null;
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
  showDivider: number; // 0 | 1
  createdAt: number;
  updatedAt: number;
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

// =============================================================================
// Operation Types
// =============================================================================

export interface CreatePost {
  format: Format;
  status?: Status;
  featured?: boolean;
  pinned?: boolean;
  path?: string;
  title?: string;
  url?: string;
  body?: string;
  quoteText?: string;
  rating?: number;
  collectionId?: number;
  replyToId?: number;
  publishedAt?: number;
  mediaIds?: string[];
}

export interface UpdatePost {
  format?: Format;
  status?: Status;
  featured?: boolean;
  pinned?: boolean;
  path?: string | null;
  title?: string | null;
  url?: string | null;
  body?: string | null;
  quoteText?: string | null;
  rating?: number | null;
  collectionId?: number | null;
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
  showDivider?: boolean;
}

export interface UpdateCollection {
  slug?: string;
  title?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: SortOrder;
  position?: number;
  showDivider?: boolean;
}

// =============================================================================
// View Model Types (render-ready, for theme components)
// =============================================================================

/**
 * Render-ready post data for theme components.
 * All fields are pre-computed -- no lib/ imports needed.
 */
export interface PostView {
  // Identity
  id: number;
  /** Pre-computed permalink: "/{path}" if path set, otherwise "/p/{sqid}" */
  permalink: string;
  /** Custom URL path, if set. Supports multi-level paths (e.g. "2024/my-post") */
  path?: string;

  // Content
  title?: string;
  /** Pre-sanitized HTML */
  bodyHtml?: string;
  /** Pre-computed excerpt, max 160 chars */
  excerpt?: string;
  /** HTML excerpt for article previews (paragraph-aware, ~500 chars) */
  summaryHtml?: string;
  /** Whether summaryHtml was truncated (content continues beyond excerpt) */
  summaryHasMore?: boolean;
  /** URL for link/quote formats */
  url?: string;
  /** Quoted text for quote format */
  quoteText?: string;

  // Metadata
  format: Format;
  status: Status;
  featured: boolean;
  pinned: boolean;
  rating?: number;

  // Collection
  collectionId?: number;

  // Time -- pre-formatted
  /** ISO 8601 string */
  publishedAt: string;
  /** Human-readable, e.g. "Feb 1, 2024" */
  publishedAtFormatted: string;
  /** 24-hour time, e.g. "23:05" */
  publishedAtTime: string;
  /** Short relative time, e.g. "5m", "3h", "2d", "Feb 1" */
  publishedAtRelative: string;
  /** ISO 8601 string */
  updatedAt: string;

  // Media -- URLs pre-computed
  media: MediaView[];

  // Thread context
  replyToId?: number;
  threadRootId?: number;

  // Raw content (for forms/editing, not typical theme use)
  body?: string;
}

/**
 * Render-ready page data for theme components.
 */
export interface PageView {
  id: number;
  slug: string;
  title?: string;
  bodyHtml?: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

/**
 * Render-ready media data for theme components.
 * URLs are pre-computed -- no lib/ imports needed.
 */
export interface MediaView {
  id: string;
  /** Full-size URL, pre-computed */
  url: string;
  /** Thumbnail URL, pre-computed */
  thumbnailUrl: string;
  mimeType: string;
  altText?: string;
  width?: number;
  height?: number;
  size?: number;
}

/**
 * Render-ready navigation item for theme components.
 * Active/external state pre-computed.
 */
export interface NavItemView {
  id: number;
  type: NavItemType;
  label: string;
  url: string;
  pageId?: number;
  /** Pre-computed based on currentPath */
  isActive: boolean;
  /** Pre-computed: starts with http(s):// */
  isExternal: boolean;
}

/**
 * Render-ready search result for theme components.
 */
export interface SearchResultView {
  post: PostView;
  rank: number;
  snippet?: string;
}

/**
 * Render-ready timeline item for theme components.
 */
export interface TimelineItemView {
  post: PostView;
  threadPreview?: {
    replies: PostView[];
    totalReplyCount: number;
  };
}

/**
 * Typed archive group with pre-formatted label.
 */
export interface ArchiveGroup {
  /** e.g. "2024" */
  year: string;
  /** e.g. "02" */
  month: string;
  /** Pre-formatted, e.g. "February 2024" */
  label: string;
  posts: PostView[];
}

// =============================================================================
// Timeline Load-More Types
// =============================================================================

/** A date-based group of timeline items (shared utility type) */
export interface DateGroup {
  dateKey: string;
  label: string;
  items: TimelineItemView[];
}

/** A single SSE DOM patch instruction returned by timelineMore */
export interface TimelinePatch {
  selector: string;
  content: string;
  mode?:
    | "append"
    | "prepend"
    | "inner"
    | "outer"
    | "before"
    | "after"
    | "remove";
}

/** Props passed to the theme's timelineMore renderer */
export interface TimelineMoreProps {
  items: TimelineItemView[];
  lastDate?: string;
  hasMore: boolean;
  nextCursor?: number;
  theme?: ThemeComponents;
}

// =============================================================================
// Configuration Types
// =============================================================================

import type { FC, PropsWithChildren } from "hono/jsx";
import type { ColorTheme } from "./theme/color-themes.js";

/**
 * Search result from FTS5
 */
export interface SearchResult {
  post: Post;
  /** FTS5 rank score (lower is better) */
  rank: number;
  /** Highlighted snippet from content */
  snippet?: string;
}

// =============================================================================
// Site Layout Props
// =============================================================================

export interface SiteLayoutProps {
  siteName: string;
  siteDescription?: string;
  links: NavItemView[];
  currentPath: string;
}

// =============================================================================
// Page-Level Props
// =============================================================================

/** Props for the home page component */
export interface HomePageProps {
  items: TimelineItemView[];
  pinnedItems: PostView[];
  hasMore: boolean;
  nextCursor?: number;
  theme?: ThemeComponents;
}

/** Props for the single post page component */
export interface PostPageProps {
  post: PostView;
  theme?: ThemeComponents;
}

/** Props for the custom page component */
export interface SinglePageProps {
  page: PageView;
  theme?: ThemeComponents;
}

/** Props for the featured page component */
export interface FeaturedPageProps {
  items: TimelineItemView[];
  hasMore: boolean;
  nextCursor?: number;
  theme?: ThemeComponents;
}

/** Props for the archive page component */
export interface ArchivePageProps {
  groups: ArchiveGroup[];
  hasMore: boolean;
  nextCursor?: number;
  format?: Format;
  featured?: boolean;
  theme?: ThemeComponents;
}

/** Props for the search page component */
export interface SearchPageProps {
  query: string;
  results: SearchResultView[];
  error?: string;
  hasMore: boolean;
  page: number;
  theme?: ThemeComponents;
}

/** Props for the single collection page component */
export interface CollectionPageProps {
  collection: Collection;
  posts: PostView[];
  hasMore: boolean;
  nextCursor?: number;
  theme?: ThemeComponents;
}

/** Props for the collections list page component */
export interface CollectionsPageProps {
  collections: (Collection & { postCount: number })[];
  theme?: ThemeComponents;
}

// =============================================================================
// Feed Data Types
// =============================================================================

/** Data passed to RSS/Atom feed renderers */
export interface FeedData {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  siteLanguage: string;
  posts: PostView[];
}

/** Data passed to sitemap renderers */
export interface SitemapData {
  siteUrl: string;
  posts: PostView[];
  pages: PageView[];
}

// =============================================================================
// Timeline Types
// =============================================================================

/** Props for per-type timeline cards */
export interface TimelineCardProps {
  post: PostView;
  compact?: boolean;
}

/** Props for thread inline preview */
export interface ThreadPreviewProps {
  rootPost: PostView;
  previewReplies: PostView[];
  totalReplyCount: number;
  theme?: ThemeComponents;
}

/** Props for the timeline feed wrapper */
export interface TimelineFeedProps {
  items: TimelineItemView[];
  hasMore: boolean;
  nextCursor?: number;
  theme?: ThemeComponents;
}

/** Props for the timeline load-more button */
export interface TimelineLoadMoreProps {
  nextCursor: number;
  /** Last visible date key (YYYY-MM-DD) for merging groups across pages */
  lastDate?: string;
  theme?: ThemeComponents;
}

/**
 * Theme component overrides
 */
export interface ThemeComponents {
  // Layout
  SiteLayout?: FC<PropsWithChildren<SiteLayoutProps>>;

  // Pages
  HomePage?: FC<HomePageProps>;
  PostPage?: FC<PostPageProps>;
  SinglePage?: FC<SinglePageProps>;
  FeaturedPage?: FC<FeaturedPageProps>;
  ArchivePage?: FC<ArchivePageProps>;
  SearchPage?: FC<SearchPageProps>;
  CollectionPage?: FC<CollectionPageProps>;
  CollectionsPage?: FC<CollectionsPageProps>;

  // Timeline sub-components (by format)
  NoteCard?: FC<TimelineCardProps>;
  LinkCard?: FC<TimelineCardProps>;
  QuoteCard?: FC<TimelineCardProps>;
  ThreadPreview?: FC<ThreadPreviewProps>;
  TimelineFeed?: FC<TimelineFeedProps>;
  TimelineLoadMore?: FC<TimelineLoadMoreProps>;

  // Shared sub-components
  Pagination?: FC<PaginationComponentProps>;
  PagePagination?: FC<PagePaginationComponentProps>;
  EmptyState?: FC<EmptyStateComponentProps>;
  MediaGallery?: FC<MediaGalleryComponentProps>;
}

/**
 * Real component prop types (re-exported from component files via index.ts).
 * These are provided here as aliases to avoid circular imports in types.ts.
 * The canonical definitions live in the component files.
 */

/** @see Pagination component in theme/components/Pagination.tsx */
export interface PaginationComponentProps {
  baseUrl: string;
  hasMore: boolean;
  nextCursor?: number | string;
  prevCursor?: number | string;
  cursorParam?: string;
}

/** @see PagePagination component in theme/components/Pagination.tsx */
export interface PagePaginationComponentProps {
  baseUrl: string;
  currentPage: number;
  hasMore: boolean;
  pageParam?: string;
}

/** @see EmptyState component in theme/components/EmptyState.tsx */
export interface EmptyStateComponentProps {
  message: string;
  ctaText?: string;
  ctaHref?: string;
  centered?: boolean;
}

/** @see MediaGallery component in theme/components/MediaGallery.tsx */
export interface MediaGalleryComponentProps {
  attachments: MediaView[];
}

/**
 * Theme configuration
 */
export interface JantTheme {
  /** Theme name */
  name?: string;
  /** Component overrides */
  components?: ThemeComponents;
  /** Feed renderer overrides (RSS, Atom, Sitemap) */
  feed?: {
    /** Custom RSS 2.0 renderer -- returns XML string */
    rss?: (data: FeedData) => string;
    /** Custom Atom renderer -- returns XML string */
    atom?: (data: FeedData) => string;
    /** Custom Sitemap renderer -- returns XML string */
    sitemap?: (data: SitemapData) => string;
  };
  /** Renders SSE patches for timeline load-more responses */
  timelineMore?: (props: TimelineMoreProps) => TimelinePatch[];
  /** CSS variable overrides (highest priority, always applied) */
  cssVariables?: Record<string, string>;
  /** Replace built-in color themes with a custom list */
  colorThemes?: ColorTheme[];
}

/**
 * Main Jant configuration
 *
 * Configuration Philosophy:
 * - Use environment variables for runtime config (API keys, feature flags, site settings)
 * - Use code config (this object) for compile-time customization (theme components)
 *
 * Site-level settings (name, description, language) are configured via
 * environment variables, not here. See lib/config.ts for details.
 */
export interface JantConfig {
  /** Theme configuration (components, CSS overrides) */
  theme?: JantTheme;
}
