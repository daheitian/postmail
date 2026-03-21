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

function toSite(row) {
  return {
    id: getRequiredString(row, "id"),
    key: getRequiredString(row, "key"),
    status: getRequiredString(row, "status"),
    createdAt: getRequiredNumber(row, "created_at"),
    updatedAt: getRequiredNumber(row, "updated_at"),
  };
}

export function getCliSiteResolutionMode(env = process.env) {
  return env.SITE_RESOLUTION_MODE === "host-based"
    ? "host-based"
    : "single-site";
}

export async function resolveCliSite(queryRunner, options = {}) {
  const resolutionMode = getCliSiteResolutionMode(options.env);
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
        "single-site mode requires an initialized site. Start Jant once or run a command that can bootstrap the default site.",
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
        ? "single-site mode requires exactly one site in the instance."
        : "CLI site selection for host-based mode is not implemented yet. Run the command against a single-site instance.";
    throw new Error(message);
  }

  return {
    created: false,
    site: toSite(rows[0]),
  };
}
