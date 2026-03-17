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

export default defineConfig({
  server: {
    port: 9020,
    host: true,
    allowedHosts: true,
  },

  preview: {
    port: 9020,
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
