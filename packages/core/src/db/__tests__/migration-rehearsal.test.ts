import { execFileSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, join } from "path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(import.meta.dirname, "../../../../../");
const CORE_DIR = resolve(REPO_ROOT, "packages/core");
const PNPM_BIN = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function queryLocalCount(persistDir: string, sql: string) {
  const stdout = execFileSync(
    PNPM_BIN,
    [
      "exec",
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      persistDir,
      "--command",
      sql,
      "--json",
    ],
    {
      cwd: CORE_DIR,
      encoding: "utf-8",
    },
  );
  const parsed = JSON.parse(stdout);
  const statement = Array.isArray(parsed) ? parsed[0] : parsed;
  return Number(statement?.results?.[0]?.count ?? 0);
}

describe("migration rehearsal", () => {
  it("rebuilds a local D1 from a frozen fixture", () => {
    const persistDir = mkdtempSync(join(tmpdir(), "jant-rehearsal-"));

    try {
      execFileSync(
        process.execPath,
        [
          "./bin/jant.js",
          "db",
          "rehearse",
          "--local",
          "--persist-to",
          persistDir,
          "--fixture",
          "src/db/rehearsal-fixtures/demo-current.json",
        ],
        {
          cwd: CORE_DIR,
          encoding: "utf-8",
        },
      );

      expect(
        queryLocalCount(
          persistDir,
          "SELECT COUNT(*) AS count FROM post WHERE deleted_at IS NULL",
        ),
      ).toBeGreaterThan(0);
      expect(
        queryLocalCount(persistDir, "SELECT COUNT(*) AS count FROM post_fts"),
      ).toBeGreaterThan(0);
    } finally {
      rmSync(persistDir, { recursive: true, force: true });
    }
  }, 45_000);
});
