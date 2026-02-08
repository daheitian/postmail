#!/usr/bin/env node
/**
 * Integration test for the create-jant template.
 *
 * Scaffolds a project using the CLI and verifies that `pnpm build` succeeds.
 * This catches issues like broken tsconfig extends, missing monorepo-only transforms, etc.
 *
 * Usage: node scripts/test-template.js [path-to-core-tarball]
 *
 * If no tarball path is provided, it will pack @jant/core automatically.
 */
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const MONOREPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  return execSync(cmd, { stdio: "inherit", ...opts });
}

function runCapture(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf-8", ...opts }).trim();
}

async function main() {
  console.log("Testing create-jant template...\n");

  // 1. Pack @jant/core into a tarball
  let coreTarball = process.argv[2];
  if (!coreTarball) {
    console.log("Step 1: Packing @jant/core...");
    const coreDir = path.resolve(MONOREPO_ROOT, "packages/core");
    const packOutput = runCapture("pnpm pack --pack-destination /tmp", { cwd: coreDir });
    coreTarball = packOutput.split("\n").pop();
    console.log(`  Tarball: ${coreTarball}\n`);
  } else {
    coreTarball = path.resolve(coreTarball);
    console.log(`Step 1: Using provided tarball: ${coreTarball}\n`);
  }

  // 2. Create a temp directory and scaffold the project
  const testDir = path.join(os.tmpdir(), `create-jant-test-${Date.now()}`);
  const projectDir = path.join(testDir, "test-project");
  console.log(`Step 2: Scaffolding project in ${projectDir}...`);
  await fs.ensureDir(testDir);

  const cliPath = path.join(PACKAGE_ROOT, "dist/index.js");
  if (!(await fs.pathExists(cliPath))) {
    console.error(`  ✗ CLI not built. Run "pnpm --filter create-jant prepublishOnly" first.`);
    process.exit(1);
  }

  run(`node ${cliPath} test-project -y`, { cwd: testDir });
  console.log();

  // 3. Replace @jant/core dependency with local tarball
  console.log("Step 3: Linking local @jant/core...");
  const pkgPath = path.join(projectDir, "package.json");
  const pkg = await fs.readJson(pkgPath);
  pkg.dependencies["@jant/core"] = `file:${coreTarball}`;
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
  console.log(`  Replaced @jant/core with file:${coreTarball}\n`);

  // 4. Install dependencies
  console.log("Step 4: Installing dependencies...");
  run("pnpm install --no-frozen-lockfile", { cwd: projectDir });
  console.log();

  // 5. Run build
  console.log("Step 5: Running pnpm build...");
  run("pnpm build", { cwd: projectDir });
  console.log();

  // 6. Run typecheck
  console.log("Step 6: Running pnpm typecheck...");
  run("pnpm typecheck", { cwd: projectDir });
  console.log();

  // Cleanup
  await fs.remove(testDir);

  console.log("✓ Template integration test passed!");
}

main().catch((error) => {
  console.error("\n✗ Template integration test failed:", error.message);
  process.exit(1);
});
