/**
 * Jant Type Definitions
 */

// =============================================================================
// Content Types
// =============================================================================

export const POST_TYPES = [
  "note",
  "article",
  "link",
  "quote",
  "image",
  "page",
] as const;
export type PostType = (typeof POST_TYPES)[number];

export const MAX_MEDIA_ATTACHMENTS = 20;

/**
 * Media attachment rules per post type.
 * Each entry is [min, max] or null (no media allowed).
 */
export const POST_TYPE_MEDIA_RULES: Record<PostType, [number, number] | null> =
  {
    note: [0, 20],
    article: [0, 20],
    image: [1, 20],
    link: [0, 1],
    quote: [0, 20],
    page: null,
  };

export const STORAGE_DRIVERS = ["r2", "s3"] as const;
export type StorageDriver = (typeof STORAGE_DRIVERS)[number];

export const VISIBILITY_LEVELS = [
  "featured",
  "quiet",
  "unlisted",
  "draft",
] as const;
export type Visibility = (typeof VISIBILITY_LEVELS)[number];

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
 * - envOnly: false → User-configurable (DB > ENV > Default)
 * - envOnly: true → Environment-only (ENV > Default)
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
  type: PostType;
  visibility: Visibility;
  title: string | null;
  path: string | null;
  content: string | null;
  contentHtml: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  sourceDomain: string | null;
  replyToId: number | null;
  threadId: number | null;
  deletedAt: number | null;
  publishedAt: number;
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
  title: string;
  path: string | null;
  description: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PostCollection {
  postId: number;
  collectionId: number;
  addedAt: number;
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

export interface NavigationLink {
  id: number;
  label: string;
  url: string;
  position: number;
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// Operation Types
// =============================================================================

export interface CreatePost {
  type: PostType;
  visibility?: Visibility;
  title?: string;
  path?: string;
  content?: string;
  sourceUrl?: string;
  sourceName?: string;
  replyToId?: number;
  publishedAt?: number;
  mediaIds?: string[];
}

export interface UpdatePost {
  type?: PostType;
  visibility?: Visibility;
  title?: string | null;
  path?: string | null;
  content?: string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  publishedAt?: number;
  mediaIds?: string[];
}

export interface CreateNavigationLink {
  label: string;
  url: string;
  position?: number;
}

export interface UpdateNavigationLink {
  label?: string;
  url?: string;
  position?: number;
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
  navigationLinks: NavigationLink[];
  currentPath: string;
}

// =============================================================================
// Page-Level Props
// =============================================================================

/** Props for the home page component */
export interface HomePageProps {
  items: TimelineItemData[];
  hasMore: boolean;
  nextCursor?: number;
  theme?: ThemeComponents;
}

/** Props for the single post page component */
export interface PostPageProps {
  post: Post;
  mediaAttachments: MediaAttachment[];
  theme?: ThemeComponents;
}

/** Props for the custom page component */
export interface SinglePageProps {
  page: Post;
  theme?: ThemeComponents;
}

/** Props for the archive page component */
export interface ArchivePageProps {
  posts: Post[];
  hasMore: boolean;
  nextCursor?: number;
  type?: string;
  grouped: Map<string, Post[]>;
  replyCounts: Map<number, number>;
  theme?: ThemeComponents;
}

/** Props for the search page component */
export interface SearchPageProps {
  query: string;
  results: SearchResult[];
  error: string | null;
  hasMore: boolean;
  page: number;
  theme?: ThemeComponents;
}

/** Props for the collection page component */
export interface CollectionPageProps {
  collection: Collection;
  posts: Post[];
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
  posts: Post[];
  /** Map of post ID to raw media records (for enclosures) */
  mediaMap: Map<number, Media[]>;
  /** R2 public URL for media enclosures */
  r2PublicUrl?: string;
  /** S3 public URL for media enclosures */
  s3PublicUrl?: string;
}

/** Data passed to sitemap renderers */
export interface SitemapData {
  siteUrl: string;
  posts: Post[];
}

// =============================================================================
// Timeline Types
// =============================================================================

/** Props for per-type timeline cards */
export interface TimelineCardProps {
  post: PostWithMedia;
  compact?: boolean;
}

/** Props for thread inline preview */
export interface ThreadPreviewProps {
  rootPost: PostWithMedia;
  previewReplies: PostWithMedia[];
  totalReplyCount: number;
  theme?: ThemeComponents;
}

/** Data structure for a single timeline item */
export interface TimelineItemData {
  post: PostWithMedia;
  threadPreview?: {
    replies: PostWithMedia[];
    totalReplyCount: number;
  };
}

/** Props for the timeline feed wrapper */
export interface TimelineFeedProps {
  items: TimelineItemData[];
  hasMore: boolean;
  nextCursor?: number;
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
  ArchivePage?: FC<ArchivePageProps>;
  SearchPage?: FC<SearchPageProps>;
  CollectionPage?: FC<CollectionPageProps>;

  // Timeline sub-components
  NoteCard?: FC<TimelineCardProps>;
  ArticleCard?: FC<TimelineCardProps>;
  LinkCard?: FC<TimelineCardProps>;
  QuoteCard?: FC<TimelineCardProps>;
  ImageCard?: FC<TimelineCardProps>;
  ThreadPreview?: FC<ThreadPreviewProps>;
  TimelineFeed?: FC<TimelineFeedProps>;

  // Shared sub-components (re-exported real prop types from component files)
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
  attachments: MediaAttachment[];
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
    /** Custom RSS 2.0 renderer — returns XML string */
    rss?: (data: FeedData) => string;
    /** Custom Atom renderer — returns XML string */
    atom?: (data: FeedData) => string;
    /** Custom Sitemap renderer — returns XML string */
    sitemap?: (data: SitemapData) => string;
  };
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
