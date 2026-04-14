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
  Media,
  MediaAttachment,
  PostWithMedia,
  Collection,
  NavItem,
  CustomUrl,
  Setting,
  CreatePost,
  UpdatePost,
  PostAttachmentInput,
  TextAttachmentContent,
  CreateNavItem,
  UpdateNavItem,
  CreateCollection,
  UpdateCollection,
  AppConfig,
  TextAttachmentContentFormat,
  // View Model types
  PostView,
  MediaView,
  NavItemView,
  SearchResultView,
  TimelineItemView,
  ArchiveGroup,
  // Page props
  ArchiveFilters,
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
  TEXT_ATTACHMENT_CONTENT_FORMATS,
  MEDIA_KINDS,
} from "./types.js";

// Utilities
export * as time from "./lib/time.js";
export * as url from "./lib/url.js";
export * as markdown from "./lib/markdown.js";

// View Model conversion utilities
export {
  createMediaContext,
  toPostView,
  toPostViews,
  toMediaView,
  toNavItemView,
  toNavItemViews,
  toSearchResultView,
  toArchiveGroups,
  toArchiveGroupsWithMedia,
} from "./lib/view.js";
export type { MediaContext } from "./lib/view.js";

// Default feed renderers (for custom feed implementations)
export { defaultFeedRenderer, defaultSitemapRenderer } from "./lib/feed.js";

// GitHub Sync queue handler (for Cloudflare Workers queue consumer)
export { handleQueueBatch as handleGitHubSyncQueueBatch } from "./lib/github-sync-queue-handler.js";
