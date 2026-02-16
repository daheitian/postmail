/**
 * Services (v2)
 *
 * Business logic layer
 */

import type { Database } from "../db/index.js";
import { createSettingsService, type SettingsService } from "./settings.js";
import { createPostService, type PostService } from "./post.js";
import { createPageService, type PageService } from "./page.js";
import { createRedirectService, type RedirectService } from "./redirect.js";
import { createMediaService, type MediaService } from "./media.js";
import {
  createCollectionService,
  type CollectionService,
} from "./collection.js";
import { createSearchService, type SearchService } from "./search.js";
import { createNavItemService, type NavItemService } from "./navigation.js";

export interface Services {
  settings: SettingsService;
  posts: PostService;
  pages: PageService;
  redirects: RedirectService;
  media: MediaService;
  collections: CollectionService;
  search: SearchService;
  navItems: NavItemService;
}

export function createServices(db: Database, d1: D1Database): Services {
  return {
    settings: createSettingsService(db),
    posts: createPostService(db),
    pages: createPageService(db),
    redirects: createRedirectService(db),
    media: createMediaService(db),
    collections: createCollectionService(db),
    search: createSearchService(d1),
    navItems: createNavItemService(db),
  };
}

export type { SettingsService } from "./settings.js";
export type { PostService, PostFilters } from "./post.js";
export type { PageService } from "./page.js";
export type { RedirectService } from "./redirect.js";
export type { MediaService } from "./media.js";
export type { CollectionService } from "./collection.js";
export type { SearchService, SearchResult, SearchOptions } from "./search.js";
export type { NavItemService } from "./navigation.js";
