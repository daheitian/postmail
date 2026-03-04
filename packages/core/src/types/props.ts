/**
 * Page-Level Props & Feed Data Types
 */

import type { Format, Visibility } from "./constants.js";
import type { Collection } from "./entities.js";
import type {
  PostView,
  PageView,
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
}

/** Props for the custom page component */
export interface SinglePageProps {
  page: PageView;
}

/** Props for the featured page component */
export interface FeaturedPageProps {
  items: TimelineItemView[];
}

/** Props for the archive page component */
export interface ArchivePageProps {
  groups: ArchiveGroup[];
  hasMore: boolean;
  nextCursor?: string;
  format?: Format;
  visibility?: Visibility;
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
}

/** Props for the timeline feed wrapper */
export interface TimelineFeedProps {
  items: TimelineItemView[];
  currentPage?: number;
  totalPages?: number;
}
