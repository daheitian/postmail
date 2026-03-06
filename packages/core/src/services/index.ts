/**
 * Services (v2)
 *
 * Business logic layer
 */

import type { Database } from "../db/index.js";
import { createSettingsService, type SettingsService } from "./settings.js";
import { createPostService, type PostService } from "./post.js";
import { createCustomUrlService, type CustomUrlService } from "./custom-url.js";
import { createMediaService, type MediaService } from "./media.js";
import {
  createCollectionService,
  type CollectionService,
} from "./collection.js";
import { createSearchService, type SearchService } from "./search.js";
import { createNavItemService, type NavItemService } from "./navigation.js";
import { createAuthService, type AuthService } from "./auth.js";

export interface Services {
  settings: SettingsService;
  posts: PostService;
  customUrls: CustomUrlService;
  media: MediaService;
  collections: CollectionService;
  search: SearchService;
  navItems: NavItemService;
  auth: AuthService;
}

export function createServices(
  db: Database,
  d1: D1Database,
  config?: { slugIdLength?: number },
): Services {
  const settings = createSettingsService(db);
  return {
    settings,
    posts: createPostService(db, {
      slugIdLength: config?.slugIdLength ?? 5,
    }),
    customUrls: createCustomUrlService(db),
    media: createMediaService(db),
    collections: createCollectionService(db),
    search: createSearchService(d1),
    navItems: createNavItemService(db),
    auth: createAuthService(db, settings),
  };
}

export type { SettingsService } from "./settings.js";
export type { PostService, PostFilters, PostDeleteDeps } from "./post.js";
export type { CustomUrlService } from "./custom-url.js";
export type { MediaService, MediaFilters } from "./media.js";
export type { CollectionService } from "./collection.js";
export type { SearchService, SearchResult, SearchOptions } from "./search.js";
export type { NavItemService } from "./navigation.js";
export type { AuthService } from "./auth.js";
