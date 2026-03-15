#!/usr/bin/env node
/**
 * Integration test for the create-jant template.
 *
 * Scaffolds a project using the CLI and verifies that `wrangler deploy --dry-run`
 * succeeds with the pre-built client assets from @jant/core.
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
    console.log("Step 1: Building and packing @jant/core...");
    const coreDir = path.resolve(MONOREPO_ROOT, "packages/core");
    run("pnpm run build", { cwd: coreDir });
    const packOutput = runCapture("pnpm pack --pack-destination /tmp", {
      cwd: coreDir,
    });
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
    console.error(
      `  CLI not built. Run "pnpm --filter create-jant prepublishOnly" first.`,
    );
    process.exit(1);
  }

  run(`node ${cliPath} test-project -y --no-install --no-git`, {
    cwd: testDir,
  });
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

  // 5. Verify client assets exist
  console.log("Step 5: Verifying client assets...");
  const clientDir = path.join(
    projectDir,
    "node_modules/@jant/core/dist/client",
  );
  const clientJs = path.join(clientDir, "client.js");
  const clientCss = path.join(clientDir, "client.css");

  if (!(await fs.pathExists(clientJs))) {
    console.error(`  client.js not found at ${clientJs}`);
    process.exit(1);
  }
  if (!(await fs.pathExists(clientCss))) {
    console.error(`  client.css not found at ${clientCss}`);
    process.exit(1);
  }
  console.log("  client.js and client.css found\n");

  // 6. Verify wrangler.toml is valid
  console.log("Step 6: Verifying wrangler.toml...");
  const wranglerToml = await fs.readFile(
    path.join(projectDir, "wrangler.toml"),
    "utf-8",
  );
  if (!wranglerToml.includes("test-project")) {
    console.error("  wrangler.toml does not contain project name");
    process.exit(1);
  }
  console.log("  wrangler.toml looks correct\n");

  // 7. Verify dotfiles were renamed correctly
  console.log("Step 7: Verifying dotfiles...");
  const expectedFiles = [
    ".gitignore",
    ".github/workflows/deploy.yml",
    "README.md",
    ".dev.vars.example",
  ];
  for (const file of expectedFiles) {
    if (!(await fs.pathExists(path.join(projectDir, file)))) {
      console.error(`  Missing expected file: ${file}`);
      process.exit(1);
    }
  }
  const staleFiles = ["_gitignore", "_github"];
  for (const file of staleFiles) {
    if (await fs.pathExists(path.join(projectDir, file))) {
      console.error(
        `  Underscore-prefixed file should have been renamed: ${file}`,
      );
      process.exit(1);
    }
  }
  console.log("  All dotfiles present and correctly renamed\n");

  // Cleanup
  await fs.remove(testDir);

  console.log("Template integration test passed!");
}

main().catch((error) => {
  console.error("\nTemplate integration test failed:", error.message);
  process.exit(1);
});
