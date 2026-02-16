/**
 * Jant - A microblog system
 *
 * @packageDocumentation
 */

// Main app factory
export { createApp } from "./app.js";
export type { App, AppVariables } from "./app.js";

// Default theme
export { theme as threadsTheme } from "./themes/threads/index.js";
export type { ThemeOptions as ThreadsThemeOptions } from "./themes/threads/index.js";

// Types
export type {
  Format,
  Status,
  SortOrder,
  NavItemType,
  Bindings,
  Post,
  Page,
  Media,
  MediaAttachment,
  PostWithMedia,
  Collection,
  NavItem,
  Redirect,
  Setting,
  CreatePost,
  UpdatePost,
  CreatePage,
  UpdatePage,
  CreateNavItem,
  UpdateNavItem,
  CreateCollection,
  UpdateCollection,
  JantConfig,
  JantTheme,
  ThemeComponents,
  // View Model types (for theme authors)
  PostView,
  PageView,
  MediaView,
  NavItemView,
  SearchResultView,
  TimelineItemView,
  ArchiveGroup,
  // Timeline types
  TimelineCardProps,
  ThreadPreviewProps,
  TimelineFeedProps,
  TimelineLoadMoreProps,
  DateGroup,
  TimelinePatch,
  TimelineMoreProps,
  // Site layout
  SiteLayoutProps,
  // Page-level props (for theme authors)
  HomePageProps,
  PostPageProps,
  SinglePageProps,
  ArchivePageProps,
  SearchPageProps,
  CollectionPageProps,
  FeaturedPageProps,
  CollectionsPageProps,
  // Feed types (for theme authors)
  FeedData,
  SitemapData,
  // Search
  SearchResult,
} from "./types.js";

export {
  FORMATS,
  STATUSES,
  SORT_ORDERS,
  NAV_ITEM_TYPES,
  MAX_MEDIA_ATTACHMENTS,
  MAX_PINNED_POSTS,
} from "./types.js";

// Utilities (for theme authors)
export * as time from "./lib/time.js";
export * as sqid from "./lib/sqid.js";
export * as url from "./lib/url.js";
export * as markdown from "./lib/markdown.js";

// View Model conversion utilities (for advanced theme use)
export {
  createMediaContext,
  toPostView,
  toPostViews,
  toMediaView,
  toPageView,
  toNavItemView,
  toNavItemViews,
  toSearchResultView,
  toArchiveGroups,
} from "./lib/view.js";
export type { MediaContext } from "./lib/view.js";

// Render helper (for theme authors adding custom routes)
export { renderPublicPage } from "./lib/render.js";
export type { RenderPublicPageOptions } from "./lib/render.js";

// Navigation helper (for theme authors)
export { getNavigationData } from "./lib/navigation.js";
export type { NavigationData } from "./lib/navigation.js";

// Default feed renderers (for theme authors to extend)
export {
  defaultRssRenderer,
  defaultAtomRenderer,
  defaultSitemapRenderer,
} from "./lib/feed.js";
