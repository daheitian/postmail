import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { migrate } from "../runtime.js";
import type { Bindings } from "../../types.js";

describe("jant db execute-file", () => {
  const tempDirs: string[] = [];
  const originalEnv = process.env.DATABASE_URL;
  const siteId = "sit_01jpyz2pvf4m7s2k8r5c9t0qce";

  afterEach(async () => {
    if (originalEnv === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalEnv;
    }

    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("executes a SQL file against Node SQLite", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-db-execute-file-"));
    tempDirs.push(root);

    const databasePath = join(root, "jant.sqlite");
    const sqlPath = join(root, "seed.sql");

    migrate({ DATABASE_URL: `file:${databasePath}` } as Bindings);
    process.env.DATABASE_URL = `file:${databasePath}`;

    await writeFile(
      sqlPath,
      `
        INSERT INTO "site" ("id", "key", "status", "created_at", "updated_at")
        VALUES ('${siteId}', 'default', 'active', 1774009100, 1774009100);

        INSERT INTO "site_setting" ("site_id", "key", "value", "updated_at")
        VALUES ('${siteId}', 'SITE_NAME', 'Imported Site', 1774009200);
      `,
    );

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { run } = await import("../../../bin/commands/db/execute-file.js");

    await run(["--file", sqlPath]);

    const sqlite = new Database(databasePath, { readonly: true });
    try {
      const value = sqlite
        .prepare(
          `SELECT "value" FROM "site_setting" WHERE "site_id" = '${siteId}' AND "key" = 'SITE_NAME'`,
        )
        .pluck()
        .get();
      expect(value).toBe("Imported Site");
    } finally {
      sqlite.close();
    }

    expect(logSpy).toHaveBeenCalledWith(
      `Executed ${sqlPath} against Node SQLite (${databasePath}).`,
    );
  });

  it("delegates remote SQL files to the D1 command runner", async () => {
    const root = await mkdtemp(join(tmpdir(), "jant-db-execute-file-remote-"));
    tempDirs.push(root);

    const sqlPath = join(root, "seed.sql");
    await writeFile(sqlPath, "BEGIN TRANSACTION;\nSELECT 1;\nCOMMIT;\n");

    const executeD1 = vi.fn(() => [{ success: true }]);
    vi.doMock("../../../bin/lib/d1-query.js", () => ({ executeD1 }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { run } = await import("../../../bin/commands/db/execute-file.js");

    await run([
      "--remote",
      "--file",
      sqlPath,
      "--config",
      "wrangler.toml",
      "--env",
      "production",
      "--database",
      "APP_DB",
    ]);

    expect(executeD1).toHaveBeenCalledWith("SELECT 1;", "d1-remote", {
      configPath: "wrangler.toml",
      database: "APP_DB",
      env: "production",
      quiet: true,
      persistTo: undefined,
    });
    expect(logSpy).toHaveBeenCalledWith(
      `Executed 1 statement from ${sqlPath} against remote D1.`,
    );
  });
});
