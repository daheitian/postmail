import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreDir = resolve(__dirname, "../../packages/core");
const runJantScript = resolve(__dirname, "../run-jant.mjs");
const canonicalDir = resolve(
  __dirname,
  "../../sites/demo-source/canonical/snapshot",
);
const checkOnly = process.argv.includes("--check");

if (!existsSync(resolve(canonicalDir, "meta.json"))) {
  console.error(
    [
      "Missing canonical demo snapshot at sites/demo-source/canonical/snapshot.",
      "Run `mise run demo-source-export-canonical` first.",
    ].join("\n"),
  );
  process.exit(1);
}

if (checkOnly) {
  console.log("Local demo snapshot prerequisites look good.");
  console.log(`  Canonical dir: ${canonicalDir}`);
  process.exit(0);
}

console.log(`Importing canonical demo snapshot from ${canonicalDir}...`);

execFileSync(
  process.execPath,
  [
    runJantScript,
    "site",
    "snapshot",
    "import",
    "--local",
    "--path",
    canonicalDir,
    "--replace",
    "--remap-site",
  ],
  {
    cwd: coreDir,
    stdio: "inherit",
  },
);
