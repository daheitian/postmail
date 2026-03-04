/**
 * View Model Types (render-ready, for theme components)
 */

import type { Format, Status, Visibility, NavItemType } from "./constants.js";
import type { Post, Collection } from "./entities.js";

/**
 * Render-ready post data for theme components.
 * All fields are pre-computed -- no lib/ imports needed.
 */
export interface PostView {
  // Identity
  /** Base58-encoded UUIDv7 identifier */
  id: string;
  /** Pre-computed permalink: "/{path}" if path set, otherwise "/p/{id}" */
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
  visibility: Visibility;
  pinned: boolean;
  rating?: number;

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
  /** Base58-encoded UUIDv7 of the parent post */
  replyToId?: string;
  /** Base58-encoded UUIDv7 of the thread root post */
  threadRootId?: string;

  // Raw content (for forms/editing, not typical theme use)
  body?: string;
}

/**
 * Render-ready page data for theme components.
 */
export interface PageView {
  /** Base58-encoded UUIDv7 identifier */
  id: string;
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
  blurhash?: string;
  posterUrl?: string;
  originalName?: string;
  summary?: string;
  chars?: number;
}

/**
 * Render-ready navigation item for theme components.
 * Active/external state pre-computed.
 */
export interface NavItemView {
  /** Base58-encoded UUIDv7 identifier */
  id: string;
  type: NavItemType;
  label: string;
  url: string;
  /** Base58-encoded UUIDv7 of linked page */
  pageId?: string;
  /** Pre-computed based on currentPath */
  isActive: boolean;
  /** Pre-computed: starts with http(s):// */
  isExternal: boolean;
}

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

/**
 * Render-ready search result for theme components.
 */
export interface SearchResultView {
  post: PostView;
  rank: number;
  /** FTS5 snippet from body_text column with <mark> tags */
  snippet?: string;
  /** Title with matched query terms wrapped in <mark> */
  titleHighlighted?: string;
  /** quoteText (truncated) with matched query terms wrapped in <mark> */
  quoteHighlighted?: string;
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

/**
 * Site Layout Props
 */
export interface SiteLayoutProps {
  siteName: string;
  links: NavItemView[];
  currentPath: string;
  isAuthenticated?: boolean;
  collections?: Collection[];
  homeDefaultView?: string;
  headerNavMaxVisible?: number;
  siteAvatarUrl?: string;
  showHeaderAvatar?: boolean;
  siteFooterHtml?: string;
  sidebar?: import("hono/jsx").Child;
  uploadMaxFileSize?: number;
}
