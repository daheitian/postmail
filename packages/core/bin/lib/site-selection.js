import { typeidUnboxed } from "typeid-js";

function escapeSqlString(value) {
  return String(value).replaceAll("'", "''");
}

function getOptionalString(row, key) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function getRequiredString(row, key) {
  const value = getOptionalString(row, key);
  if (!value) {
    throw new Error(`Site row is missing required ${key}.`);
  }
  return value;
}

function getRequiredNumber(row, key) {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  throw new Error(`Site row is missing required ${key}.`);
}

function normalizePathPrefix(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed === "/") {
    return null;
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalized = withLeadingSlash.replace(/\/+$/, "");
  return normalized || null;
}

function resolveSelector(options = {}) {
  if (typeof options.site === "string" && options.site.trim()) {
    return {
      kind: "site",
      siteId: options.site.trim(),
    };
  }

  if (typeof options.url === "string" && options.url.trim()) {
    const parsed = new URL(options.url.trim());
    return {
      kind: "host",
      host: parsed.host,
      pathPrefix: normalizePathPrefix(parsed.pathname),
    };
  }

  if (typeof options.host === "string" && options.host.trim()) {
    return {
      kind: "host",
      host: options.host.trim(),
      pathPrefix: normalizePathPrefix(options.pathPrefix),
    };
  }

  return null;
}

async function resolveSiteById(queryRunner, siteId) {
  const rows = await queryRunner.query(`
    SELECT "id", "key", "status", "created_at", "updated_at"
    FROM "site"
    WHERE "id" = '${escapeSqlString(siteId)}'
    LIMIT 1
  `);

  if (rows.length === 0) {
    throw new Error(`No site found for --site ${siteId}.`);
  }

  return {
    created: false,
    site: toSite(rows[0]),
  };
}

async function resolveSiteByHost(queryRunner, host, pathPrefix) {
  const pathPrefixPredicate =
    pathPrefix === null
      ? `"site_domain"."path_prefix" IS NULL`
      : `"site_domain"."path_prefix" = '${escapeSqlString(pathPrefix)}'`;
  const rows = await queryRunner.query(`
    SELECT
      "site"."id",
      "site"."key",
      "site"."status",
      "site"."created_at",
      "site"."updated_at"
    FROM "site_domain"
    INNER JOIN "site" ON "site"."id" = "site_domain"."site_id"
    WHERE "site_domain"."host" = '${escapeSqlString(host)}'
      AND ${pathPrefixPredicate}
    ORDER BY "site"."created_at", "site"."id"
    LIMIT 2
  `);

  if (rows.length === 0) {
    throw new Error(
      `No site found for host "${host}"${pathPrefix ? ` and path prefix "${pathPrefix}"` : ""}.`,
    );
  }

  if (rows.length > 1) {
    throw new Error(
      `Multiple sites matched host "${host}"${pathPrefix ? ` and path prefix "${pathPrefix}"` : ""}.`,
    );
  }

  return {
    created: false,
    site: toSite(rows[0]),
  };
}

function toSite(row) {
  return {
    id: getRequiredString(row, "id"),
    key: getRequiredString(row, "key"),
    status: getRequiredString(row, "status"),
    createdAt: getRequiredNumber(row, "created_at"),
    updatedAt: getRequiredNumber(row, "updated_at"),
  };
}

function formatSiteSummary(rows) {
  return rows
    .map((row) => `${getRequiredString(row, "key")} (${getRequiredString(row, "id")})`)
    .join(", ");
}

export function getCliSiteResolutionMode(env = process.env) {
  return env.SITE_RESOLUTION_MODE === "host-based"
    ? "host-based"
    : "single-site";
}

export async function resolveCliSite(queryRunner, options = {}) {
  const resolutionMode = getCliSiteResolutionMode(options.env);
  const selector = resolveSelector(options);

  if (selector?.kind === "site") {
    return resolveSiteById(queryRunner, selector.siteId);
  }

  if (selector?.kind === "host") {
    return resolveSiteByHost(queryRunner, selector.host, selector.pathPrefix);
  }

  const rows = await queryRunner.query(`
    SELECT "id", "key", "status", "created_at", "updated_at"
    FROM "site"
    ORDER BY "created_at", "id"
    LIMIT 2
  `);

  if (rows.length === 0) {
    if (resolutionMode !== "single-site") {
      throw new Error(
        "No site configured for this instance. Create a site before using host-based mode.",
      );
    }

    if (!options.createIfMissing || typeof queryRunner.execute !== "function") {
      throw new Error(
        "single-site mode requires an initialized site. Complete /setup first or run a command that can bootstrap the site shell.",
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const siteId = options.bootstrapSite?.id ?? typeidUnboxed("sit");
    const siteKey = options.bootstrapSite?.key ?? "default";

    await queryRunner.execute(`
      INSERT INTO "site" ("id", "key", "status", "created_at", "updated_at")
      VALUES (
        '${escapeSqlString(siteId)}',
        '${escapeSqlString(siteKey)}',
        'active',
        ${timestamp},
        ${timestamp}
      );
    `);

    return {
      created: true,
      site: {
        id: siteId,
        key: siteKey,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    };
  }

  if (rows.length > 1) {
    const message =
      resolutionMode === "single-site"
        ? `single-site mode found multiple sites in the database: ${formatSiteSummary(rows)}. Restore SITE_RESOLUTION_MODE=host-based for this database, or remove the extra sites before restarting in single-site mode.`
        : "host-based mode requires --site, --host, or --url when the database contains multiple sites.";
    throw new Error(message);
  }

  return {
    created: false,
    site: toSite(rows[0]),
  };
}
