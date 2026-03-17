const TABLE_EXPORT_ORDER = [
  "setting",
  "user",
  "account",
  "verification",
  "session",
  "collection",
  "nav_item",
  "collection_directory_item",
  "api_token",
  "post",
  "post_collection",
  "path_registry",
  "media",
];

const EXCLUDED_TABLES = new Set([
  "__drizzle_migrations",
  "d1_migrations",
  "data_migration",
]);

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function sqlValue(value) {
  if (value === null) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "bigint") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  if (value instanceof Uint8Array) {
    return `X'${toHex(value)}'`;
  }

  if (value instanceof ArrayBuffer) {
    return `X'${toHex(new Uint8Array(value))}'`;
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

export function buildInsertStatement(tableName, columnNames, row) {
  const columns = columnNames.map(quoteIdentifier).join(", ");
  const values = columnNames.map((column) => sqlValue(row[column])).join(", ");
  return `INSERT INTO ${quoteIdentifier(tableName)} (${columns}) VALUES(${values});`;
}

export function sortExportTables(tableNames) {
  const order = new Map(
    TABLE_EXPORT_ORDER.map((table, index) => [table, index]),
  );

  return [...tableNames].sort((left, right) => {
    const leftIndex = order.get(left);
    const rightIndex = order.get(right);

    if (leftIndex !== undefined && rightIndex !== undefined) {
      return leftIndex - rightIndex;
    }

    if (leftIndex !== undefined) {
      return -1;
    }

    if (rightIndex !== undefined) {
      return 1;
    }

    return left.localeCompare(right);
  });
}

export async function listExportTables(queryRunner) {
  const rows = await queryRunner.query(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);

  return sortExportTables(
    rows
      .filter((row) => typeof row.name === "string" && row.name.length > 0)
      .filter((row) => !EXCLUDED_TABLES.has(row.name))
      .filter((row) => !String(row.name).startsWith("post_fts"))
      .filter(
        (row) => !String(row.sql ?? "").startsWith("CREATE VIRTUAL TABLE"),
      )
      .map((row) => row.name),
  );
}

export async function getTableColumns(queryRunner, tableName) {
  const rows = await queryRunner.query(
    `PRAGMA table_info(${quoteIdentifier(tableName)})`,
  );

  return rows
    .slice()
    .sort((left, right) => Number(left.cid) - Number(right.cid))
    .map((row) => String(row.name));
}

export async function dumpDatabaseToSql(queryRunner, options) {
  const tables = await listExportTables(queryRunner);
  const timestamp = new Date().toISOString();
  let sql = `-- Jant database export\n`;
  sql += `-- Exported: ${timestamp}\n`;
  sql += `-- Source: ${options.source}\n\n`;

  for (const tableName of tables) {
    const columnNames = await getTableColumns(queryRunner, tableName);
    if (columnNames.length === 0) {
      continue;
    }

    const rows = await queryRunner.query(
      `SELECT * FROM ${quoteIdentifier(tableName)}`,
    );
    if (rows.length === 0) {
      continue;
    }

    sql += `-- ${tableName}\n`;
    sql += rows
      .map((row) => buildInsertStatement(tableName, columnNames, row))
      .join("\n");
    sql += "\n\n";
  }

  return sql;
}
