/**
 * Jant - A microblog system
 *
 * @packageDocumentation
 */

import { createApp as _createApp } from "./app.js";

// Main app factory
export { createApp } from "./app.js";
export type { App, AppVariables } from "./app.js";

// Types
export type {
  PostType,
  Visibility,
  Bindings,
  Post,
  Media,
  MediaAttachment,
  PostWithMedia,
  Collection,
  PostCollection,
  Redirect,
  Setting,
  NavigationLink,
  CreatePost,
  UpdatePost,
  JantConfig,
  JantTheme,
  ThemeComponents,
  // Timeline types
  TimelineCardProps,
  ThreadPreviewProps,
  TimelineItemData,
  TimelineFeedProps,
  // Site layout
  SiteLayoutProps,
  // Page-level props (for theme authors)
  HomePageProps,
  PostPageProps,
  SinglePageProps,
  ArchivePageProps,
  SearchPageProps,
  CollectionPageProps,
  // Feed types (for theme authors)
  FeedData,
  SitemapData,
  // Search
  SearchResult,
} from "./types.js";

export {
  POST_TYPES,
  VISIBILITY_LEVELS,
  MAX_MEDIA_ATTACHMENTS,
  POST_TYPE_MEDIA_RULES,
} from "./types.js";

// Utilities (for theme authors)
export * as time from "./lib/time.js";
export * as sqid from "./lib/sqid.js";
export * as url from "./lib/url.js";
export * as markdown from "./lib/markdown.js";

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

// Default export for running core directly (e.g., for development)
export default _createApp();
