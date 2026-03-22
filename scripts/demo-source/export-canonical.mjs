import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDemoWorkflowEnv } from "../demo-shared/env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const demoSourceDir = resolve(__dirname, "../../sites/demo-source");
const outputDir = resolve(demoSourceDir, "canonical/snapshot");
const canonicalDir = resolve(demoSourceDir, "canonical");
const runJantScript = resolve(__dirname, "../run-jant.mjs");

loadDemoWorkflowEnv({ sites: ["demo-source"] });

mkdirSync(canonicalDir, { recursive: true });
const tempOutputDir = mkdtempSync(join(canonicalDir, ".snapshot-export-"));

console.log("Exporting canonical demo snapshot from demo-source...");

try {
  execFileSync(
    process.execPath,
    [
      runJantScript,
      "site",
      "snapshot",
      "export",
      "--remote",
      "--output",
      tempOutputDir,
      "--force",
    ],
    {
      cwd: demoSourceDir,
      env: { ...process.env, SNAPSHOT_SUPPRESS_SUCCESS_LOG: "true" },
      stdio: "inherit",
    },
  );

  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true, force: true });
  }

  renameSync(tempOutputDir, outputDir);
  console.log(`Canonical demo snapshot updated at ${outputDir}`);
} catch (error) {
  rmSync(tempOutputDir, { recursive: true, force: true });
  throw error;
}
