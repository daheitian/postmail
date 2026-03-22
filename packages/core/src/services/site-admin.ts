import { eq } from "drizzle-orm";
import { type Database, supportsDrizzleTransaction } from "../db/index.js";
import type { DatabaseDialect } from "../db/dialect.js";
import {
  sqliteSchemaBundle,
  type DatabaseSchema,
} from "../db/schema-bundle.js";
import { SETTINGS_KEYS } from "../lib/constants.js";
import { ConflictError } from "../lib/errors.js";
import { createEntityId } from "../lib/ids.js";
import { now } from "../lib/time.js";
import type { Site, SiteDomain } from "../types.js";
import { createNavItemService } from "./navigation.js";
import { createSettingsService } from "./settings.js";

const { sites: _sqliteSites, siteDomains: _sqliteSiteDomains } =
  sqliteSchemaBundle;

export interface CreateManagedSiteInput {
  key: string;
  primaryHost: string;
  siteName: string;
}

export interface ManagedSiteResult {
  domain: SiteDomain;
  site: Site;
}

export interface SiteAdminService {
  createManagedSite(input: CreateManagedSiteInput): Promise<ManagedSiteResult>;
}

function toSite(row: typeof _sqliteSites.$inferSelect): Site {
  return {
    id: row.id,
    key: row.key,
    status: row.status as Site["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSiteDomain(row: typeof _sqliteSiteDomains.$inferSelect): SiteDomain {
  return {
    id: row.id,
    siteId: row.siteId,
    host: row.host,
    pathPrefix: row.pathPrefix,
    kind: row.kind as SiteDomain["kind"],
    redirectToPrimary: row.redirectToPrimary,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createSiteAdminService(
  db: Database,
  databaseSchema: DatabaseSchema = sqliteSchemaBundle,
  databaseDialect: DatabaseDialect = "sqlite",
): SiteAdminService {
  const { settings, siteDomains, sites } = databaseSchema;

  async function createWithDatabase(
    targetDb: Database,
    input: CreateManagedSiteInput,
  ): Promise<ManagedSiteResult> {
    const siteKey = input.key.trim();
    const primaryHost = input.primaryHost.trim().toLowerCase();
    const siteName = input.siteName.trim();

    const existingSite = await targetDb
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.key, siteKey))
      .limit(1);
    if (existingSite[0]) {
      throw new ConflictError("Site key is already in use.");
    }

    const existingDomain = await targetDb
      .select({ id: siteDomains.id })
      .from(siteDomains)
      .where(eq(siteDomains.host, primaryHost))
      .limit(1);
    if (existingDomain[0]) {
      throw new ConflictError("Primary host is already in use.");
    }

    const timestamp = now();
    const siteId = createEntityId("site");
    const domainId = createEntityId("siteDomain");

    const siteRow = (
      await targetDb
        .insert(sites)
        .values({
          id: siteId,
          key: siteKey,
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning()
    )[0];

    const domainRow = (
      await targetDb
        .insert(siteDomains)
        .values({
          id: domainId,
          siteId,
          host: primaryHost,
          pathPrefix: null,
          kind: "primary",
          redirectToPrimary: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning()
    )[0];

    await targetDb
      .insert(settings)
      .values({
        siteId,
        key: SETTINGS_KEYS.SITE_NAME,
        value: siteName,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: [settings.siteId, settings.key],
        set: {
          value: siteName,
          updatedAt: timestamp,
        },
      });

    const settingsService = createSettingsService(
      targetDb,
      siteId,
      databaseSchema,
      databaseDialect,
    );
    await settingsService.completeOnboarding();

    const navItems = createNavItemService(targetDb, siteId, databaseSchema);
    await navItems.ensureSystemDefaults();

    return {
      site: toSite(siteRow),
      domain: toSiteDomain(domainRow),
    };
  }

  return {
    async createManagedSite(input) {
      if (supportsDrizzleTransaction(db, databaseDialect)) {
        return db.transaction(async (tx) =>
          createWithDatabase(tx as unknown as Database, input),
        );
      }

      return createWithDatabase(db, input);
    },
  };
}
