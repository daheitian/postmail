/**
 * Page-Level Props & Feed Data Types
 */

import type { Format, MediaKind } from "./constants.js";
import type { Collection } from "./entities.js";
import type {
  PostView,
  TimelineItemView,
  SearchResultView,
  ArchiveGroup,
} from "./views.js";

// =============================================================================
// Page-Level Props
// =============================================================================

/** Props for the home page component */
export interface HomePageProps {
  items: TimelineItemView[];
  currentPage: number;
  totalPages: number;
}

/** Props for the single post page component */
export interface PostPageProps {
  post: PostView;
  threadPosts?: PostView[];
}

/** Props for the featured page component */
export interface FeaturedPageProps {
  items: TimelineItemView[];
}

/** Visibility filter values for the archive page (includes "featured" as a virtual value). */
export type ArchiveVisibility = "public" | "unlisted" | "private" | "featured";

/** Filters currently active on the archive page */
export interface ArchiveFilters {
  year?: number;
  collectionSlug?: string;
  collectionTitle?: string;
  format?: Format;
  mediaKinds?: MediaKind[];
  hasTitle?: boolean;
  visibility?: ArchiveVisibility;
}

/** Props for the archive page component */
export interface ArchivePageProps {
  groups: ArchiveGroup[];
  currentPage: number;
  totalPages: number;
  filters: ArchiveFilters;
  availableYears: number[];
  availableCollections: { slug: string; title: string }[];
  isAuthenticated: boolean;
}

/** Props for the search page component */
export interface SearchPageProps {
  query: string;
  results: SearchResultView[];
  error?: string;
  hasMore: boolean;
  page: number;
}

/** Props for the single collection page component */
export interface CollectionPageProps {
  collection: Collection;
  items: TimelineItemView[];
  hasMore: boolean;
  nextCursor?: string;
}

/** Props for the collections list page component */
export interface CollectionsPageProps {
  collections: (Collection & { postCount: number })[];
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
}

// =============================================================================
// Timeline Types
// =============================================================================

/**
 * Display mode for timeline cards.
 * - `compact` — condensed view used in thread previews
 * - `feed`    — standard timeline card (default)
 * - `detail`  — full single-post page view
 */
export type CardMode = "compact" | "feed" | "detail";

/** Props for per-type timeline cards */
export interface TimelineCardProps {
  post: PostView;
  mode?: CardMode;
}

/** Props for thread inline preview */
export interface ThreadPreviewProps {
  rootPost: PostView;
  latestReply: PostView;
  parentReply?: PostView;
  totalReplyCount: number;
}

/** Props for the timeline feed wrapper */
export interface TimelineFeedProps {
  items: TimelineItemView[];
  currentPage?: number;
  totalPages?: number;
}
