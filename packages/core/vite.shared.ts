/**
 * Shared Vite configuration used by all three config files.
 *
 * Exports:
 * - pkg: package.json data (version, dependencies)
 * - CLIENT_TARGET: browser target for client asset compilation
 * - clientBuildOptions: rollup input/output for public/auth JS and CSS assets
 * - swcPlugin: SWC with Hono JSX + Lingui macro transforms
 */

import swc from "unplugin-swc";
import { resolve } from "path";
import { readFileSync } from "fs";
import { ASSET_BASE_SEGMENT } from "./src/lib/asset-path.js";

const dir = import.meta.dirname;

export const pkg = JSON.parse(
  readFileSync(resolve(dir, "package.json"), "utf-8"),
);

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
    },
    output: {
      entryFileNames: `${ASSET_BASE_SEGMENT}/[name].js`,
      chunkFileNames: `${ASSET_BASE_SEGMENT}/assets/[name]-[hash].js`,
      assetFileNames: (assetInfo) => {
        switch (assetInfo.name) {
          case "style.css":
            return `${ASSET_BASE_SEGMENT}/client.css`;
          case "style-cjk.css":
            return `${ASSET_BASE_SEGMENT}/client-cjk.css`;
          case "style-cjk-tc.css":
            return `${ASSET_BASE_SEGMENT}/client-cjk-tc.css`;
          default:
            return `${ASSET_BASE_SEGMENT}/assets/[name]-[hash][extname]`;
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
