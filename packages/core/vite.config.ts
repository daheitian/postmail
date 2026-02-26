/**
 * Development server (`vite dev`).
 *
 * Full HMR with Tailwind, SWC (Lingui), and Cloudflare Workers.
 * Production builds use vite.config.worker.ts and vite.config.client.ts.
 */

import { defineConfig, type Plugin } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { exec } from "child_process";
import { pkg, clientBuildOptions, swcPlugin } from "./vite.shared";

/**
 * Auto-extract and compile i18n catalogs when source files change.
 * Debounced to 500ms so rapid saves don't spawn multiple processes.
 */
function linguiAutoExtract(): Plugin {
  const coreDir = import.meta.dirname;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;

  function run() {
    if (running) return;
    running = true;
    exec("pnpm i18n:build", { cwd: coreDir }, (err) => {
      running = false;
      if (err) console.error("[i18n] extract failed:", err.message);
    });
  }

  return {
    name: "lingui-auto-extract",
    apply: "serve",
    hotUpdate({ file }) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) return;
      if (file.includes("/i18n/locales/")) return;
      clearTimeout(timer);
      timer = setTimeout(run, 500);
    },
  };
}

/**
 * Full page reload when server/worker code changes.
 * @cloudflare/vite-plugin only hot-updates the worker module,
 * but for SSR apps the browser needs a full reload to see new HTML.
 */
function ssrReload(): Plugin {
  return {
    name: "ssr-reload",
    hotUpdate({ modules, server }) {
      if (this.environment.name !== "client" && modules.length > 0) {
        server.hot.send({ type: "full-reload" });
        return [];
      }
    },
  };
}

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
