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

async function main() {
  console.log("Preparing template for publishing...");

  // Merge tsconfig.json
  const tsconfigPath = path.join(TEMPLATE_DIR, "tsconfig.json");
  if (await fs.pathExists(tsconfigPath)) {
    const tsconfig = await fs.readJson(tsconfigPath);

    if (tsconfig.extends) {
      console.log("  ✓ Merging tsconfig.json (removing extends)");

      if (await fs.pathExists(ROOT_TSCONFIG)) {
        const rootTsconfig = await fs.readJson(ROOT_TSCONFIG);

        // Merge: parent compilerOptions + child compilerOptions
        const merged = {
          compilerOptions: {
            ...rootTsconfig.compilerOptions,
            ...tsconfig.compilerOptions,
          },
          include: tsconfig.include,
          exclude: tsconfig.exclude,
        };

        await fs.writeJson(tsconfigPath, merged, { spaces: 2 });
        console.log("  ✓ tsconfig.json merged successfully");
      } else {
        console.error("  ✗ Root tsconfig.json not found:", ROOT_TSCONFIG);
        process.exit(1);
      }
    }
  }

  console.log("Template prepared!");
}

main().catch((error) => {
  console.error("Error preparing template:", error);
  process.exit(1);
});
