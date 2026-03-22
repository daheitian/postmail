/**
 * Services (v2)
 *
 * Business logic layer
 */

import type { Database } from "../db/index.js";
import type { DatabaseDialect } from "../db/dialect.js";
import type { RawQueryClient } from "../db/raw-query.js";
import {
  sqliteSchemaBundle,
  type DatabaseSchema,
} from "../db/schema-bundle.js";
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
import { createSiteAdminService, type SiteAdminService } from "./site-admin.js";
import {
  createSiteMemberService,
  type SiteMemberService,
} from "./site-member.js";
import {
  createSiteProfileService,
  type SiteProfileService,
} from "./site-profile.js";
import type { HostedControlPlaneClient } from "../lib/hosted-control-plane.js";
import type { EnsureSingleSiteOptions } from "./site.js";

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
  siteAdmin: SiteAdminService;
  siteMembers: SiteMemberService;
  siteProfile: SiteProfileService;
}

export function createServices(
  db: Database,
  rawQuery: RawQueryClient,
  siteId: string,
  config?: {
    slugIdLength?: number;
    schema?: DatabaseSchema;
    databaseDialect?: DatabaseDialect;
    bootstrapSite?: EnsureSingleSiteOptions;
    hostedControlPlane?: HostedControlPlaneClient | null;
  },
): Services {
  const databaseSchema = config?.schema ?? sqliteSchemaBundle;
  const dialect = config?.databaseDialect ?? "sqlite";
  const settings = createSettingsService(db, siteId, databaseSchema, dialect);
  const paths = createPathService(db, siteId, databaseSchema);
  const navItems = createNavItemService(db, siteId, databaseSchema);
  return {
    settings,
    paths,
    posts: createPostService(
      db,
      {
        slugIdLength: config?.slugIdLength ?? 5,
        databaseDialect: dialect,
      },
      siteId,
      paths,
      databaseSchema,
    ),
    customUrls: createCustomUrlService(db, siteId, paths, databaseSchema),
    media: createMediaService(db, siteId, databaseSchema, dialect),
    collections: createCollectionService(
      db,
      siteId,
      paths,
      databaseSchema,
      dialect,
    ),
    search: createSearchService(rawQuery, siteId, dialect),
    navItems,
    auth: createAuthService(
      db,
      settings,
      {
        databaseDialect: dialect,
      },
      databaseSchema,
    ),
    apiTokens: createApiTokenService(db, siteId, databaseSchema),
    bootstrap: createBootstrapService(db, {
      schema: databaseSchema,
      bootstrapSite: config?.bootstrapSite,
    }),
    siteAdmin: createSiteAdminService(db, databaseSchema, dialect),
    siteMembers: createSiteMemberService(db, databaseSchema),
    siteProfile: createSiteProfileService(settings, siteId, {
      hostedControlPlane: config?.hostedControlPlane ?? null,
      logSyncError: (error) => {
        const message =
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error);
        process.stderr.write(
          `[Jant] Hosted control plane metadata sync failed: ${message}\n`,
        );
      },
    }),
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
export type { SiteMemberService } from "./site-member.js";
export type { SiteProfileService } from "./site-profile.js";
export type {
  CreateManagedSiteInput,
  ManagedSiteResult,
  SiteAdminService,
} from "./site-admin.js";
