import { and, asc, eq, isNull } from "drizzle-orm";
import type { Database } from "../db/index.js";
import {
  sqliteSchemaBundle,
  type DatabaseSchema,
} from "../db/schema-bundle.js";
import { createEntityId } from "../lib/ids.js";
import { now } from "../lib/time.js";
import type { Site, SiteDomain } from "../types.js";

const { sites: _sqliteSites, siteDomains: _sqliteSiteDomains } =
  sqliteSchemaBundle;

export interface SiteLookupResult {
  site: Site;
  domain: SiteDomain | null;
}

export interface EnsureSingleSiteOptions {
  host?: string | null;
  key?: string;
  pathPrefix?: string | null;
}

export interface ResolveSingleSiteOptions extends EnsureSingleSiteOptions {
  createIfMissing?: boolean;
}

export interface SiteService {
  list(): Promise<Site[]>;
  getById(id: string): Promise<Site | null>;
  getOnlySite(): Promise<Site | null>;
  resolveSingleSite(
    options?: ResolveSingleSiteOptions,
  ): Promise<SiteLookupResult>;
  ensureSingleSite(
    options?: EnsureSingleSiteOptions,
  ): Promise<SiteLookupResult>;
  resolveByHost(
    host: string,
    pathPrefix?: string | null,
  ): Promise<SiteLookupResult | null>;
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

export const TRANSIENT_SINGLE_SITE_ID = "sit_pending";

function createTransientSingleSite(key = "default"): Site {
  return {
    id: TRANSIENT_SINGLE_SITE_ID,
    key,
    status: "active",
    createdAt: 0,
    updatedAt: 0,
  };
}

export function createSiteService(
  db: Database,
  databaseSchema: DatabaseSchema = sqliteSchemaBundle,
): SiteService {
  const { siteDomains, sites } = databaseSchema;

  async function loadSingleSiteRow() {
    const rows = await db
      .select()
      .from(sites)
      .orderBy(asc(sites.createdAt))
      .limit(2);

    if (rows.length > 1) {
      throw new Error(
        "single-site mode requires exactly one site in the instance.",
      );
    }

    return rows[0];
  }

  return {
    async list() {
      const rows = await db.select().from(sites).orderBy(asc(sites.createdAt));
      return rows.map(toSite);
    },

    async getById(id) {
      const rows = await db
        .select()
        .from(sites)
        .where(eq(sites.id, id))
        .limit(1);
      return rows[0] ? toSite(rows[0]) : null;
    },

    async getOnlySite() {
      const row = await loadSingleSiteRow();
      if (!row) {
        return null;
      }
      return toSite(row);
    },

    async resolveSingleSite(options = {}) {
      const shouldCreateIfMissing = options.createIfMissing ?? false;
      const existingRow = await loadSingleSiteRow();
      const timestamp = now();
      const created = existingRow
        ? existingRow
        : shouldCreateIfMissing
          ? (
              await db
                .insert(sites)
                .values({
                  id: createEntityId("site"),
                  key: options.key?.trim() || "default",
                  status: "active",
                  createdAt: timestamp,
                  updatedAt: timestamp,
                })
                .returning()
            )[0]
          : null;

      if (!created) {
        return {
          site: createTransientSingleSite(options.key?.trim() || "default"),
          domain: null,
        };
      }

      let domainRow: typeof siteDomains.$inferSelect | undefined;

      if (options.host) {
        const domainRows = await db
          .select()
          .from(siteDomains)
          .where(eq(siteDomains.siteId, created.id))
          .orderBy(asc(siteDomains.createdAt))
          .limit(1);

        domainRow = domainRows[0];

        if (!domainRow && shouldCreateIfMissing) {
          domainRow = (
            await db
              .insert(siteDomains)
              .values({
                id: createEntityId("siteDomain"),
                siteId: created.id,
                host: options.host,
                pathPrefix: options.pathPrefix?.trim() || null,
                kind: "primary",
                redirectToPrimary: true,
                createdAt: timestamp,
                updatedAt: timestamp,
              })
              .returning()
          )[0];
        }
      }

      return {
        site: toSite(created),
        domain: domainRow ? toSiteDomain(domainRow) : null,
      };
    },

    async ensureSingleSite(options = {}) {
      return this.resolveSingleSite({
        ...options,
        createIfMissing: true,
      });
    },

    async resolveByHost(host, pathPrefix) {
      const normalizedPathPrefix = pathPrefix?.trim() || null;
      const rows = await db
        .select({
          site: sites,
          domain: siteDomains,
        })
        .from(siteDomains)
        .innerJoin(sites, eq(siteDomains.siteId, sites.id))
        .where(
          and(
            eq(siteDomains.host, host),
            normalizedPathPrefix === null
              ? isNull(siteDomains.pathPrefix)
              : eq(siteDomains.pathPrefix, normalizedPathPrefix),
          ),
        )
        .limit(1);

      const row = rows[0];
      if (!row) {
        return null;
      }

      return {
        site: toSite(row.site),
        domain: toSiteDomain(row.domain),
      };
    },
  };
}
