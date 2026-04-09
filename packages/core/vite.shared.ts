/**
 * Shared Vite configuration used by all three config files.
 *
 * Exports:
 * - pkg: package.json data (version, dependencies)
 * - buildVersion: cache-busting version token for deployed assets
 * - CLIENT_TARGET: browser target for client asset compilation
 * - clientBuildOptions: rollup input/output for public/auth JS and CSS assets
 * - swcPlugin: SWC with Hono JSX + Lingui macro transforms
 */

import swc from "unplugin-swc";
import { resolve } from "path";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import {
  ASSET_BASE_SEGMENT,
  ASSET_CHUNK_SEGMENT,
} from "./src/lib/asset-path.js";

const dir = import.meta.dirname;

export const pkg = JSON.parse(
  readFileSync(resolve(dir, "package.json"), "utf-8"),
);

function resolveRawBuildId(): string {
  const fromEnv = (process.env.JANT_BUILD_ID ?? "").trim();
  if (fromEnv) return fromEnv;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

const rawBuildId = resolveRawBuildId();
const safeBuildId = rawBuildId.replace(/[^0-9A-Za-z._-]/g, "").slice(0, 16);

/**
 * Deployed assets are cached as immutable, so semver alone is not a stable
 * cache-buster for hosted builds that ship unreleased commits.
 */
export const buildVersion = safeBuildId
  ? `${pkg.version}-${safeBuildId}`
  : pkg.version;

/** Browser target for client assets. */
export const CLIENT_TARGET = "es2022" as const;

/**
 * Client asset build options.
 *
 * Produces:
 * - `client.js` for public-page interactions
 * - `client-auth.js` for authenticated/editor interactions
 * - `client.css` for the shared site styles
 * - `client-cjk.css` for optional Simplified Chinese font assets
 * - `client-cjk-tc.css` for optional Traditional Chinese font assets
 * - `client-cjk-jp.css` for optional Japanese font assets
 * - `client-cjk-kr.css` for optional Korean font assets
 */
export const clientBuildOptions = {
  outDir: "dist/client",
  target: CLIENT_TARGET,
  rollupOptions: {
    input: {
      client: resolve(dir, "src/client.ts"),
      "client-auth": resolve(dir, "src/client-auth.ts"),
      style: resolve(dir, "src/style.css"),
      "style-cjk": resolve(dir, "src/style-cjk.css"),
      "style-cjk-tc": resolve(dir, "src/style-cjk-tc.css"),
      "style-cjk-jp": resolve(dir, "src/style-cjk-jp.css"),
      "style-cjk-kr": resolve(dir, "src/style-cjk-kr.css"),
    },
    output: {
      // Content-hashed entry names so cross-bundle ES module imports always
      // resolve to the correct version. Without hashes, the bare ./client.js
      // import in client-auth.js hits the immutably-cached old file after a
      // deploy that changes the shared exports.
      entryFileNames: `${ASSET_BASE_SEGMENT}/[name]-[hash].js`,
      chunkFileNames: `${ASSET_BASE_SEGMENT}/${ASSET_CHUNK_SEGMENT}/[name]-[hash].js`,
      assetFileNames: (assetInfo) => {
        switch (assetInfo.name) {
          case "style.css":
            return `${ASSET_BASE_SEGMENT}/client-[hash].css`;
          case "style-cjk.css":
            return `${ASSET_BASE_SEGMENT}/client-cjk-[hash].css`;
          case "style-cjk-tc.css":
            return `${ASSET_BASE_SEGMENT}/client-cjk-tc-[hash].css`;
          case "style-cjk-jp.css":
            return `${ASSET_BASE_SEGMENT}/client-cjk-jp-[hash].css`;
          case "style-cjk-kr.css":
            return `${ASSET_BASE_SEGMENT}/client-cjk-kr-[hash].css`;
          default:
            return `${ASSET_BASE_SEGMENT}/${ASSET_CHUNK_SEGMENT}/[name]-[hash][extname]`;
        }
      },
    },
  },
};

/**
 * SWC plugin for Hono JSX transforms and Lingui macro rewrites.
 * Server-side only (dev + worker builds). Client code uses Vite's default esbuild.
 */
export const swcPlugin = () =>
  swc.vite({
    jsc: {
      parser: { syntax: "typescript", tsx: true },
      transform: {
        react: {
          runtime: "automatic",
          importSource: "hono/jsx",
          throwIfNamespace: false,
        },
      },
      target: "esnext",
      experimental: {
        plugins: [
          [
            "@lingui/swc-plugin",
            {
              runtimeModules: {
                useLingui: ["@jant/core/i18n", "useLingui"],
                trans: ["@jant/core/i18n", "Trans"],
              },
            },
          ],
        ],
      },
    },
    module: { type: "es6" },
  });
