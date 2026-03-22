import { eq, sql } from "drizzle-orm";
import {
  executeStatement,
  type Database,
  supportsDrizzleTransaction,
} from "../db/index.js";
import type { DatabaseDialect } from "../db/dialect.js";
import {
  sqliteSchemaBundle,
  type DatabaseSchema,
} from "../db/schema-bundle.js";
import type { StorageDriver } from "../lib/storage.js";
import { SETTINGS_KEYS } from "../lib/constants.js";
import { ConflictError, NotFoundError } from "../lib/errors.js";
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

export interface DeleteManagedSiteDeps {
  storage?: StorageDriver | null;
}

export interface SiteAdminService {
  createManagedSite(input: CreateManagedSiteInput): Promise<ManagedSiteResult>;
  deleteManagedSite(
    siteId: string,
    deps?: DeleteManagedSiteDeps,
  ): Promise<void>;
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

function isMissingSqliteFtsTable(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`
      : String(error);

  return message.includes("no such table: post_fts");
}

export function createSiteAdminService(
  db: Database,
  databaseSchema: DatabaseSchema = sqliteSchemaBundle,
  databaseDialect: DatabaseDialect = "sqlite",
): SiteAdminService {
  const {
    apiTokens,
    collectionDirectoryItems,
    collections,
    media,
    navItems,
    pathRegistry,
    postCollections,
    posts,
    settings,
    siteDomains,
    siteMembers,
    sites,
  } = databaseSchema;

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

  async function collectStorageKeysForSite(siteId: string): Promise<string[]> {
    const mediaRows = await db
      .select({
        posterKey: media.posterKey,
        storageKey: media.storageKey,
      })
      .from(media)
      .where(eq(media.siteId, siteId));

    const settingRows = await db
      .select({
        key: settings.key,
        value: settings.value,
      })
      .from(settings)
      .where(eq(settings.siteId, siteId));

    const keys = new Set<string>();
    for (const row of mediaRows) {
      keys.add(row.storageKey);
      if (row.posterKey) {
        keys.add(row.posterKey);
      }
    }

    for (const row of settingRows) {
      if (
        row.key === SETTINGS_KEYS.SITE_AVATAR ||
        row.key === SETTINGS_KEYS.SITE_FAVICON_APPLE_TOUCH
      ) {
        if (row.value.trim()) {
          keys.add(row.value);
        }
      }
    }

    return [...keys];
  }

  async function deleteSiteRows(
    targetDb: Database,
    siteId: string,
  ): Promise<void> {
    const existingSite = await targetDb
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.id, siteId))
      .limit(1);
    if (!existingSite[0]) {
      throw new NotFoundError("Site");
    }

    await targetDb
      .delete(postCollections)
      .where(eq(postCollections.siteId, siteId));
    await targetDb.delete(pathRegistry).where(eq(pathRegistry.siteId, siteId));
    await targetDb
      .delete(collectionDirectoryItems)
      .where(eq(collectionDirectoryItems.siteId, siteId));
    await targetDb.delete(media).where(eq(media.siteId, siteId));
    await targetDb.delete(navItems).where(eq(navItems.siteId, siteId));

    await executeStatement(
      targetDb,
      sql`UPDATE post SET reply_to_id = NULL, thread_id = id WHERE site_id = ${siteId} AND reply_to_id IS NOT NULL`,
    );
    await targetDb.delete(posts).where(eq(posts.siteId, siteId));

    await targetDb.delete(collections).where(eq(collections.siteId, siteId));
    await targetDb.delete(apiTokens).where(eq(apiTokens.siteId, siteId));
    await targetDb.delete(settings).where(eq(settings.siteId, siteId));
    await targetDb.delete(siteMembers).where(eq(siteMembers.siteId, siteId));
    await targetDb.delete(siteDomains).where(eq(siteDomains.siteId, siteId));
    await targetDb.delete(sites).where(eq(sites.id, siteId));

    if (databaseDialect === "sqlite") {
      try {
        await executeStatement(
          targetDb,
          sql`INSERT INTO post_fts(post_fts) VALUES ('rebuild')`,
        );
      } catch (error) {
        if (!isMissingSqliteFtsTable(error)) {
          throw error;
        }
      }
    }
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
    async deleteManagedSite(siteId, deps) {
      const normalizedSiteId = siteId.trim();
      if (!normalizedSiteId) {
        throw new NotFoundError("Site");
      }

      if (deps?.storage) {
        const keysToDelete = await collectStorageKeysForSite(normalizedSiteId);
        if (keysToDelete.length > 0) {
          const storageDriver = deps.storage;
          await Promise.allSettled(
            keysToDelete.map((key) => storageDriver.delete(key)),
          );
        }
      }

      if (!supportsDrizzleTransaction(db, databaseDialect)) {
        await deleteSiteRows(db, normalizedSiteId);
        return;
      }

      await db.transaction(async (tx) => {
        await deleteSiteRows(tx as unknown as Database, normalizedSiteId);
      });
    },
  };
}
