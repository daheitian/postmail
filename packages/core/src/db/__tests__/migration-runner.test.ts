import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTrackedSqlFiles } from "../../../bin/lib/migration-runner.js";

const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("migration runner", () => {
  it("uses runner-specific tracked execution when available", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "jant-migration-runner-"));
    tempDirs.push(tempDir);

    const sqlPath = join(tempDir, "0001_test.sql");
    writeFileSync(
      sqlPath,
      [
        "CREATE TABLE post (id INTEGER PRIMARY KEY);",
        "--> statement-breakpoint",
        "CREATE TRIGGER post_ai AFTER INSERT ON post BEGIN",
        "  SELECT 1;",
        "END;",
      ].join("\n"),
    );

    const execute = vi.fn();
    const executeTrackedFile = vi.fn();
    const query = vi.fn().mockReturnValue([]);

    applyTrackedSqlFiles(
      { execute, executeTrackedFile, query },
      {
        files: [{ name: "0001_test.sql", path: sqlPath }],
        headline: "Schema migrations",
        tableName: "d1_migrations",
      },
    );

    expect(query).toHaveBeenCalled();
    expect(executeTrackedFile).toHaveBeenCalledOnce();
    expect(executeTrackedFile).toHaveBeenCalledWith(
      sqlPath,
      expect.stringContaining(
        'INSERT INTO "d1_migrations" ("name") VALUES (\'0001_test.sql\');',
      ),
    );
    expect(execute).toHaveBeenCalledOnce();
  });

  it("splits SQL statements without breaking semicolons inside strings", async () => {
    const { splitSqlStatements } =
      await import("../../../bin/lib/migration-runner.js");

    expect(
      splitSqlStatements(`
        -- heading
        INSERT INTO post ("body_text") VALUES ('hello; world');
        INSERT INTO post ("body_text") VALUES ('two');
      `),
    ).toEqual([
      `-- heading
        INSERT INTO post ("body_text") VALUES ('hello; world');`,
      `INSERT INTO post ("body_text") VALUES ('two');`,
    ]);
  });
});
