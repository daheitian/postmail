/**
 * Development server (`vite dev`).
 *
 * Full HMR with Tailwind, SWC (Lingui), and Cloudflare Workers.
 * Production builds use vite.config.worker.ts and vite.config.client.ts.
 */

import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { pkg, clientBuildOptions, swcPlugin } from "./vite.shared";
import { linguiAutoExtract, ssrReload } from "./vite.dev-plugins";

const DEFAULT_DEV_PORT = 9020;

function resolveDevPort(): number {
  const rawPort = process.env.PORT;
  if (!rawPort) {
    return DEFAULT_DEV_PORT;
  }

  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

export default defineConfig({
  // Vite 8 switched the default transform pipeline from esbuild to Oxc.
  // Keep Oxc disabled anywhere SWC owns the server-side transforms.
  oxc: false,

  server: {
    port: resolveDevPort(),
    host: true,
    allowedHosts: true,
  },

  preview: {
    port: resolveDevPort(),
  },

  define: {
    __JANT_DEV__: "true",
    __JANT_VERSION__: JSON.stringify(pkg.version),
  },

  environments: {
    client: {
      build: clientBuildOptions,
    },
  },

  plugins: [
    tailwindcss(),
    swcPlugin(),
    linguiAutoExtract(),
    ssrReload(),
    cloudflare({
      configPath: process.env.WRANGLER_CONFIG || "./wrangler.toml",
      // Disable inspector in Claude Code remote containers.
      ...(process.env.CLAUDE_CODE_REMOTE ? { inspectorPort: false } : {}),
    }),
  ],
});
