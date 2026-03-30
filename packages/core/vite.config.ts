/**
 * Development server (`vite dev`).
 *
 * Full HMR with Tailwind, SWC (Lingui), and Cloudflare Workers.
 * Production builds use vite.config.worker.ts and vite.config.client.ts.
 */

import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { parsePortValue } from "./src/lib/env.js";
import { buildVersion, clientBuildOptions, swcPlugin } from "./vite.shared";
import { linguiAutoExtract, ssrReload } from "./vite.dev-plugins";

export default defineConfig({
  // Vite 8 switched the default transform pipeline from esbuild to Oxc.
  // Keep Oxc disabled anywhere SWC owns the server-side transforms.
  oxc: false,

  server: {
    port: parsePortValue(process.env.PORT),
    host: true,
    allowedHosts: true,
  },

  preview: {
    port: parsePortValue(process.env.PORT),
  },

  define: {
    __JANT_DEV__: "true",
    __JANT_VERSION__: JSON.stringify(buildVersion),
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
