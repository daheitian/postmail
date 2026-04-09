import { spawn } from "node:child_process";
import {
  copyFile,
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreRoot = resolve(__dirname, "..", "..");
const tempRoot = await mkdtemp(resolve(tmpdir(), "jant-noto-serif-cjk-"));
const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const variants = {
  sc: {
    family: "Noto Serif SC",
    label: "Simplified Chinese",
    outputDir: "noto-serif-sc",
    packageName: "@fontsource/noto-serif-sc",
    sourceFiles: {
      400: "noto-serif-sc-chinese-simplified-400-normal.woff2",
      700: "noto-serif-sc-chinese-simplified-700-normal.woff2",
    },
  },
  tc: {
    family: "Noto Serif TC",
    label: "Traditional Chinese",
    outputDir: "noto-serif-tc",
    packageName: "@fontsource/noto-serif-tc",
    sourceFiles: {
      400: "noto-serif-tc-chinese-traditional-400-normal.woff2",
      700: "noto-serif-tc-chinese-traditional-700-normal.woff2",
    },
  },
  jp: {
    family: "Noto Serif JP",
    label: "Japanese",
    outputDir: "noto-serif-jp",
    packageName: "@fontsource/noto-serif-jp",
    sourceFiles: {
      400: "noto-serif-jp-japanese-400-normal.woff2",
      700: "noto-serif-jp-japanese-700-normal.woff2",
    },
  },
  kr: {
    family: "Noto Serif KR",
    label: "Korean",
    outputDir: "noto-serif-kr",
    packageName: "@fontsource/noto-serif-kr",
    sourceFiles: {
      400: "noto-serif-kr-korean-400-normal.woff2",
      700: "noto-serif-kr-korean-700-normal.woff2",
    },
  },
};

const requestedVariant = process.argv[2];

if (
  !requestedVariant ||
  !(requestedVariant in variants || requestedVariant === "all")
) {
  console.error(
    "Usage: node dev/scripts/generate-noto-serif-cjk.mjs <sc|tc|jp|kr|all>",
  );
  process.exit(1);
}

const variantEntries =
  requestedVariant === "all"
    ? Object.entries(variants)
    : [[requestedVariant, variants[requestedVariant]]];

/**
 * Run cn-font-split for a single font weight.
 *
 * @param {string} inputFile Source font filename from the selected @fontsource package.
 * @param {string} outputDir Temporary output directory.
 * @param {string} family CSS font-family to emit.
 * @param {string} weight CSS font-weight to emit.
 * @returns {Promise<void>}
 */
function splitFont(inputFile, outputDir, family, weight) {
  const args = [
    "exec",
    "cn-font-split",
    "run",
    "-i",
    inputFile,
    "-o",
    outputDir,
    "--css.fontFamily",
    family,
    "--css.fontWeight",
    weight,
    "--css.fontStyle",
    "normal",
    "--css.fontDisplay",
    "swap",
    "--css.fileName",
    "font.css",
    "--targetType",
    "woff2",
  ];

  return new Promise((resolvePromise, rejectPromise) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(pnpmBin, args, {
      cwd: coreRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      const output = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n");
      rejectPromise(
        new Error(
          `cn-font-split failed for ${family} ${weight}${output ? `\n${output}` : ""}`,
        ),
      );
    });

    child.on("error", rejectPromise);
  });
}

/**
 * Remove cn-font-split metadata comments, rewrite asset URLs to their weight
 * directory, and opt those font files out of Vite's CSS inlining.
 *
 * @param {string} css Generated CSS content.
 * @param {string} weight Weight directory name.
 * @returns {string}
 */
function rewriteCss(css, weight) {
  const withoutBanner = css.replace(/^\/\*[\s\S]*?\*\/\s*/, "");
  return withoutBanner.replace(
    /url\("\.\/([^"]+\.woff2)"\)/g,
    `url("./${weight}/$1?no-inline")`,
  );
}

try {
  for (const [variantKey, variant] of variantEntries) {
    const outputRoot = resolve(coreRoot, "src/styles/fonts", variant.outputDir);
    await rm(outputRoot, { recursive: true, force: true });
    await mkdir(outputRoot, { recursive: true });

    const cssBlocks = [];

    for (const [weight, sourceFile] of Object.entries(variant.sourceFiles)) {
      const tempDir = resolve(tempRoot, variantKey, weight);
      const sourcePath = resolve(
        coreRoot,
        "node_modules",
        variant.packageName,
        "files",
        sourceFile,
      );

      await mkdir(tempDir, { recursive: true });
      await splitFont(sourcePath, tempDir, variant.family, weight);

      const outputDir = resolve(outputRoot, weight);
      await mkdir(outputDir, { recursive: true });

      const generatedFiles = await readdir(tempDir);
      for (const file of generatedFiles.filter((entry) =>
        entry.endsWith(".woff2"),
      )) {
        await copyFile(resolve(tempDir, file), resolve(outputDir, file));
      }

      const css = await readFile(resolve(tempDir, "font.css"), "utf8");
      cssBlocks.push(rewriteCss(css, weight));
    }

    const generatedHeader = `/* Generated file. Regenerate with \`pnpm --filter @jant/core fonts:generate:${variantKey}\`.
   Source fonts: ${variant.packageName}
   Splitter: cn-font-split */`;

    await writeFile(
      resolve(outputRoot, `${variant.outputDir}.css`),
      `${generatedHeader}\n\n${cssBlocks.join("\n\n")}\n`,
    );

    console.log(
      `Generated ${variant.label} font subsets in src/styles/fonts/${variant.outputDir}.`,
    );
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
