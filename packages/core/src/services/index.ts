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
import { createAuthService, type AuthService } from "./auth.js";
import {
  createPathRegistryService,
  type PathRegistryService,
} from "./path-registry.js";

export interface Services {
  settings: SettingsService;
  posts: PostService;
  pages: PageService;
  redirects: RedirectService;
  media: MediaService;
  collections: CollectionService;
  search: SearchService;
  navItems: NavItemService;
  auth: AuthService;
  pathRegistry: PathRegistryService;
}

export function createServices(db: Database, d1: D1Database): Services {
  const settings = createSettingsService(db);
  const pathRegistry = createPathRegistryService(db);
  return {
    settings,
    pathRegistry,
    posts: createPostService(db, pathRegistry),
    pages: createPageService(db, pathRegistry),
    redirects: createRedirectService(db, pathRegistry),
    media: createMediaService(db),
    collections: createCollectionService(db),
    search: createSearchService(d1),
    navItems: createNavItemService(db),
    auth: createAuthService(db, settings),
  };
}

export type { SettingsService } from "./settings.js";
export type { PostService, PostFilters, PostDeleteDeps } from "./post.js";
export type { PageService, PageFilters } from "./page.js";
export type { RedirectService } from "./redirect.js";
export type { MediaService, MediaFilters } from "./media.js";
export type { CollectionService } from "./collection.js";
export type { SearchService, SearchResult, SearchOptions } from "./search.js";
export type { NavItemService } from "./navigation.js";
export type { AuthService } from "./auth.js";
export type { PathRegistryService, OwnerType } from "./path-registry.js";
