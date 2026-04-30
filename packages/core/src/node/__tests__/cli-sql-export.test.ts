import { describe, expect, it } from "vitest";
import { getTableColumns } from "../../../bin/lib/sql-export.js";

interface CapturedQueryRunner {
  query: (sql: string) => Promise<Array<Record<string, unknown>>>;
  lastSql?: string;
}

function createQueryRunner(
  rows: Array<Record<string, unknown>>,
): CapturedQueryRunner {
  const runner: CapturedQueryRunner = {
    async query(sql: string) {
      runner.lastSql = sql;
      return rows;
    },
  };
  return runner;
}

describe("getTableColumns", () => {
  it("filters Postgres GENERATED ALWAYS columns out of the dump column list", async () => {
    const runner = createQueryRunner([
      { name: "id" },
      { name: "title" },
      // pg already filters via is_generated = 'NEVER', so the runner only
      // returns the storable columns. We capture the SQL to assert the WHERE.
    ]);

    const columns = await getTableColumns(runner, "post", "pg");

    expect(columns).toEqual(["id", "title"]);
    expect(runner.lastSql).toMatch(/is_generated\s*=\s*'NEVER'/);
  });

  it("filters SQLite STORED/VIRTUAL generated columns via table_xinfo.hidden", async () => {
    const runner = createQueryRunner([
      { cid: 0, name: "id", hidden: 0 },
      { cid: 1, name: "title", hidden: 0 },
      { cid: 2, name: "search_virtual", hidden: 2 },
      { cid: 3, name: "search_stored", hidden: 3 },
    ]);

    const columns = await getTableColumns(runner, "post", "sqlite");

    expect(columns).toEqual(["id", "title"]);
    expect(runner.lastSql).toMatch(/PRAGMA\s+table_xinfo/);
  });
});
