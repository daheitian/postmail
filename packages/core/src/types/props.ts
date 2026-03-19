/**
 * Page-Level Props & Feed Data Types
 */

import type { CollectionSortOrder, Format, MediaKind } from "./constants.js";
import type { Collection, CollectionDirectoryItem } from "./entities.js";
import type {
  PostView,
  FeedPostView,
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
  baseUrl: string;
  showJantBranding?: boolean;
}

/** Props for the single post page component */
export interface PostPageProps {
  post: PostView;
  threadPosts?: PostView[];
}

/** Props for the featured page component */
export interface FeaturedPageProps {
  items: TimelineItemView[];
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  showJantBranding?: boolean;
}

/** Visibility filter values for the archive page (includes "featured" as a virtual value). */
export type ArchiveVisibility =
  | "public"
  | "latest_hidden"
  | "private"
  | "featured";

/** View mode for the archive page. */
export type ArchiveView = "grid" | "list";

/** Filters currently active on the archive page */
export interface ArchiveFilters {
  year?: number;
  collectionSlug?: string;
  collectionTitle?: string;
  format?: Format;
  mediaKinds?: MediaKind[];
  hasMedia?: boolean;
  hasTitle?: boolean;
  visibility?: ArchiveVisibility;
  view?: ArchiveView;
}

/** Props for the archive page component */
export interface ArchivePageProps {
  groups: ArchiveGroup[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  filters: ArchiveFilters;
  availableYears: number[];
  availableCollections: { slug: string; title: string }[];
  isAuthenticated: boolean;
  sitePathPrefix?: string;
  timeZone?: string;
}

/** Props for the search page component */
export interface SearchPageProps {
  query: string;
  results: SearchResultView[];
  error?: string;
  hasMore: boolean;
  page: number;
  sitePathPrefix?: string;
}

/** Props for the single collection page component */
export interface CollectionPageProps {
  collection: Collection;
  items: TimelineItemView[];
  totalThreadCount: number;
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  currentSort: CollectionSortOrder;
  defaultSort: CollectionSortOrder;
  showRatingSort: boolean;
  isAuthenticated: boolean;
  sitePathPrefix?: string;
}

/** Props for the collection editor page component */
export interface CollectionEditorPageProps {
  mode: "create" | "edit";
  collection?: Collection;
  cancelHref: string;
  sitePathPrefix?: string;
}

/** Props for the collections list page component */
export interface CollectionsPageProps {
  items: CollectionDirectoryItem[];
  isAuthenticated: boolean;
  sitePathPrefix?: string;
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
  /** Optional feed-specific title shown in RSS/Atom readers. */
  title?: string;
  selfUrl: string;
  posts: FeedPostView[];
}

/** Data passed to sitemap renderers */
export interface SitemapData {
  siteUrl: string;
  sitemapUrl: string;
  posts: PostView[];
}

// =============================================================================
// Timeline Types
// =============================================================================

/**
 * Display mode for timeline cards.
 * - `compact` — condensed view for constrained contexts
 * - `feed`    — standard timeline card (default)
 * - `detail`  — full single-post page view
 */
export type CardMode = "compact" | "feed" | "detail";

export interface PostFooterDisplayOptions {
  hideActions?: boolean;
  hideTimestamp?: boolean;
  hideThreadLink?: boolean;
}

export interface TimelineCardDisplayOptions {
  hideStatusBadges?: boolean;
  hideRating?: boolean;
  footer?: PostFooterDisplayOptions;
}

/** Props for per-type timeline cards */
export interface TimelineCardProps {
  post: PostView;
  mode?: CardMode;
  display?: TimelineCardDisplayOptions;
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
  baseUrl: string;
  currentPage?: number;
  totalPages?: number;
}
