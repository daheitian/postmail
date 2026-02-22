/**
 * Shared Vite configuration used by all three config files.
 *
 * Exports:
 * - pkg: package.json data (version, dependencies)
 * - CLIENT_TARGET: browser target for client asset compilation
 * - clientBuildOptions: rollup input/output for client.js + client.css
 * - swcPlugin: SWC with Hono JSX + Lingui macro transforms
 */

import swc from "unplugin-swc";
import { resolve } from "path";
import { readFileSync } from "fs";

export const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf-8"),
);

/** Browser target for client assets. */
export const CLIENT_TARGET = "es2022" as const;

/**
 * Client asset build options — produces client.js + client.css
 * consumed by wrangler [assets] in the worker-starter template.
 */
export const clientBuildOptions = {
  outDir: "dist/client",
  target: CLIENT_TARGET,
  rollupOptions: {
    input: [
      resolve(__dirname, "src/client.ts"),
      resolve(__dirname, "src/style.css"),
    ],
    output: {
      entryFileNames: "client.js",
      assetFileNames: "client[extname]",
    },
  },
};

/**
 * SWC plugin for Hono JSX transforms and Lingui macro rewrites.
 * Used by dev and worker builds. Client code uses Vite's default esbuild.
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
      target: CLIENT_TARGET,
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
