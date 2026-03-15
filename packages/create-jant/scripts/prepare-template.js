#!/usr/bin/env node
/**
 * Prepare template for npm publishing
 * - Merge tsconfig.json (remove extends, inline parent config)
 */
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const TEMPLATE_DIR = path.join(PACKAGE_ROOT, "template");
const ROOT_TSCONFIG = path.resolve(PACKAGE_ROOT, "../../tsconfig.json");

/**
 * Resolve "extends" in a tsconfig file by inlining the parent compilerOptions.
 */
async function mergeTsconfig(tsconfigPath) {
  if (!(await fs.pathExists(tsconfigPath))) return;

  const tsconfig = await fs.readJson(tsconfigPath);
  if (!tsconfig.extends) return;

  const filename = path.basename(tsconfigPath);
  console.log(`  Merging ${filename} (removing extends)...`);

  // Resolve the extends path relative to the template dir (which mirrors the monorepo layout)
  // All extends point to ../../tsconfig.json (the monorepo root)
  if (!(await fs.pathExists(ROOT_TSCONFIG))) {
    console.error("  ✗ Root tsconfig.json not found:", ROOT_TSCONFIG);
    process.exit(1);
  }

  const rootTsconfig = await fs.readJson(ROOT_TSCONFIG);

  // Merge: parent compilerOptions + child compilerOptions (child wins)
  const merged = {
    compilerOptions: {
      ...rootTsconfig.compilerOptions,
      ...tsconfig.compilerOptions,
    },
    ...(tsconfig.include && { include: tsconfig.include }),
    ...(tsconfig.exclude && { exclude: tsconfig.exclude }),
  };

  await fs.writeJson(tsconfigPath, merged, { spaces: 2 });
  console.log(`  ✓ ${filename} merged successfully`);
}

/**
 * Validate the template has no broken references that would fail in a standalone project.
 */
async function validateTemplate() {
  const errors = [];

  // Check all tsconfig files for unresolved "extends"
  const tsconfigFiles = await fs.readdir(TEMPLATE_DIR);
  for (const file of tsconfigFiles.filter(
    (f) => f.startsWith("tsconfig") && f.endsWith(".json"),
  )) {
    const filePath = path.join(TEMPLATE_DIR, file);
    const content = await fs.readJson(filePath);
    if (content.extends) {
      errors.push(
        `${file} still has "extends": "${content.extends}" (must be inlined for standalone projects)`,
      );
    }
  }

  // Note: package.json "workspace:*" is expected - the CLI replaces it at runtime

  if (errors.length > 0) {
    console.error("\n  ✗ Template validation failed:");
    for (const err of errors) {
      console.error(`    - ${err}`);
    }
    process.exit(1);
  }

  console.log("  ✓ Template validation passed");
}

async function main() {
  console.log("Preparing template for publishing...");

  // Merge all tsconfig files that use "extends"
  const tsconfigFiles = [
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
  ];
  for (const file of tsconfigFiles) {
    await mergeTsconfig(path.join(TEMPLATE_DIR, file));
  }

  // Validate the template is standalone-ready
  await validateTemplate();

  console.log("Template prepared!");
}

main().catch((error) => {
  console.error("Error preparing template:", error);
  process.exit(1);
});
