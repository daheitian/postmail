import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "vitest";

const REPO_ROOT = resolve(import.meta.dirname, "../../../../../");
const CORE_DIR = resolve(REPO_ROOT, "packages/core");
const SNAPSHOT_DIR = resolve(REPO_ROOT, "sites/demo-source/canonical/snapshot");
const NODE_BIN = process.execPath;
const JANT_BIN = resolve(CORE_DIR, "bin/jant.js");

describe("demo canonical snapshot", () => {
  it("imports into a fresh local D1 with current migrations", () => {
    const persistDir = mkdtempSync(join(tmpdir(), "jant-demo-snapshot-"));

    try {
      execFileSync(
        NODE_BIN,
        [JANT_BIN, "migrate", "--local", "--persist-to", persistDir],
        {
          cwd: CORE_DIR,
          encoding: "utf-8",
        },
      );

      execFileSync(
        NODE_BIN,
        [
          JANT_BIN,
          "site",
          "snapshot",
          "import",
          "--local",
          "--persist-to",
          persistDir,
          "--path",
          SNAPSHOT_DIR,
          "--replace",
        ],
        {
          cwd: CORE_DIR,
          encoding: "utf-8",
        },
      );
    } finally {
      rmSync(persistDir, { recursive: true, force: true });
    }
  }, 60_000);
});
