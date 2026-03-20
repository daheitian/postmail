/**
 * Services (v2)
 *
 * Business logic layer
 */

import type { Database } from "../db/index.js";
import type { RawQueryClient } from "../db/raw-query.js";
import { createSettingsService, type SettingsService } from "./settings.js";
import { createPostService, type PostService } from "./post.js";
import { createCustomUrlService, type CustomUrlService } from "./custom-url.js";
import { createPathService, type PathService } from "./path.js";
import { createMediaService, type MediaService } from "./media.js";
import {
  createCollectionService,
  type CollectionService,
} from "./collection.js";
import { createSearchService, type SearchService } from "./search.js";
import { createNavItemService, type NavItemService } from "./navigation.js";
import { createAuthService, type AuthService } from "./auth.js";
import { createApiTokenService, type ApiTokenService } from "./api-token.js";
import { createBootstrapService, type BootstrapService } from "./bootstrap.js";

export interface Services {
  settings: SettingsService;
  paths: PathService;
  posts: PostService;
  customUrls: CustomUrlService;
  media: MediaService;
  collections: CollectionService;
  search: SearchService;
  navItems: NavItemService;
  auth: AuthService;
  apiTokens: ApiTokenService;
  bootstrap: BootstrapService;
}

export function createServices(
  db: Database,
  rawQuery: RawQueryClient,
  config?: { slugIdLength?: number },
): Services {
  const settings = createSettingsService(db);
  const paths = createPathService(db);
  const navItems = createNavItemService(db);
  return {
    settings,
    paths,
    posts: createPostService(
      db,
      {
        slugIdLength: config?.slugIdLength ?? 5,
      },
      paths,
    ),
    customUrls: createCustomUrlService(db, paths),
    media: createMediaService(db),
    collections: createCollectionService(db, paths),
    search: createSearchService(rawQuery),
    navItems,
    auth: createAuthService(db, settings),
    apiTokens: createApiTokenService(db),
    bootstrap: createBootstrapService(settings, navItems),
  };
}

export type { SettingsService } from "./settings.js";
export type { PathService } from "./path.js";
export type { PostService, PostFilters, PostDeleteDeps } from "./post.js";
export type { CustomUrlService } from "./custom-url.js";
export type { MediaService, MediaFilters } from "./media.js";
export type { CollectionService } from "./collection.js";
export type { SearchService, SearchResult, SearchOptions } from "./search.js";
export type { NavItemService } from "./navigation.js";
export type { AuthService, DeleteAccountDeps } from "./auth.js";
export type { ApiTokenService } from "./api-token.js";
export type {
  BootstrapService,
  CompleteInitialSetupData,
} from "./bootstrap.js";
