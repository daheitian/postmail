import { execFileSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, join } from "path";
import { describe, it } from "vitest";

const REPO_ROOT = resolve(import.meta.dirname, "../../../../../");
const DEMO_DIR = resolve(REPO_ROOT, "sites/demo");
const PNPM_BIN = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

describe("demo seed", () => {
  it("loads into a fresh local D1 with current migrations", () => {
    const persistDir = mkdtempSync(join(tmpdir(), "jant-demo-seed-"));

    try {
      execFileSync(
        PNPM_BIN,
        ["exec", "jant", "migrate", "--local", "--persist-to", persistDir],
        {
          cwd: DEMO_DIR,
          encoding: "utf-8",
        },
      );

      execFileSync(
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
          "--file",
          "scripts/seed-demo.sql",
        ],
        {
          cwd: DEMO_DIR,
          encoding: "utf-8",
        },
      );
    } finally {
      rmSync(persistDir, { recursive: true, force: true });
    }
  }, 30_000);
});
