import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDemoWorkflowEnv } from "../demo-shared/env.mjs";
import { readDemoPublicConfig } from "./lib/runtime.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const demoPublicDir = resolve(__dirname, "../../sites/demo");
const runJantScript = resolve(__dirname, "../run-jant.mjs");
const canonicalDir = resolve(
  __dirname,
  "../../sites/demo-source/canonical/snapshot",
);

loadDemoWorkflowEnv({ sites: ["demo"] });

const siteUrl = process.env.DEMO_PUBLIC_URL || readDemoPublicConfig("SITE_URL");
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
  console.log("demo-public rebuild prerequisites look good.");
  console.log(`  Public URL:    ${siteUrl}`);
  console.log(`  Canonical dir: ${canonicalDir}`);
  process.exit(0);
}

console.log(`Importing canonical demo snapshot into ${siteUrl}...`);

execFileSync(
  process.execPath,
  [
    runJantScript,
    "site",
    "snapshot",
    "import",
    "--remote",
    "--path",
    canonicalDir,
    "--url",
    siteUrl,
    "--replace",
    "--remap-site",
  ],
  {
    cwd: demoPublicDir,
    stdio: "inherit",
  },
);
