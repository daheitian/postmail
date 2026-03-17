import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listSchemaMigrationFiles,
  readWranglerDatabaseConfig,
} from "../../../bin/lib/migration-artifacts.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  tempDirs.length = 0;
});

describe("migration artifacts", () => {
  it("reads schema migrations in Drizzle journal order", () => {
    const migrationsDir = resolve(import.meta.dirname, "../migrations");
    const files = listSchemaMigrationFiles(migrationsDir).map(
      (file) => file.name,
    );

    expect(files).toEqual(["0000_baseline.sql", "0001_fts_setup.sql"]);
  });

  it("resolves D1 migration settings from wrangler env config", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-wrangler-config-"));
    tempDirs.push(root);

    const configPath = join(root, "wrangler.toml");
    await writeFile(
      configPath,
      `
[[d1_databases]]
binding = "DB"
migrations_dir = "db/default"

[env.preview]

[[env.preview.d1_databases]]
binding = "DB"
migrations_dir = "db/preview"
migrations_table = "preview_migrations"
      `.trim(),
    );

    const config = readWranglerDatabaseConfig({
      configPath,
      database: "DB",
      env: "preview",
    });

    expect(config.migrationsDir).toBe(join(root, "db/preview"));
    expect(config.migrationsTable).toBe("preview_migrations");
    expect(config.databaseBinding).toBe("DB");
  });
});
