/**
 * Jant - A microblog system
 *
 * @packageDocumentation
 */

// Main app factory
export { createApp } from "./app.js";
export type { App, AppVariables } from "./app.js";

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
  AppConfig,
  // View Model types
  PostView,
  PageView,
  MediaView,
  NavItemView,
  SearchResultView,
  TimelineItemView,
  ArchiveGroup,
  // Feed types
  FeedData,
  SitemapData,
  // Search
  SearchResult,
} from "./types.js";

export type { ColorTheme } from "./ui/color-themes.js";

export {
  FORMATS,
  STATUSES,
  SORT_ORDERS,
  NAV_ITEM_TYPES,
  MAX_MEDIA_ATTACHMENTS,
  MAX_PINNED_POSTS,
} from "./types.js";

// Utilities
export * as time from "./lib/time.js";
export * as uid from "./lib/uid.js";
export * as url from "./lib/url.js";
export * as markdown from "./lib/markdown.js";

// View Model conversion utilities
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

// Default feed renderers (for custom feed implementations)
export {
  defaultRssRenderer,
  defaultAtomRenderer,
  defaultSitemapRenderer,
} from "./lib/feed.js";
