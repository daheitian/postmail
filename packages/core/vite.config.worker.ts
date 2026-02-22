/**
 * Library build: bundles all server code into a single dist/index.js.
 *
 * Run via: `vite build --config vite.config.worker.ts`
 *
 * External dependencies (hono, drizzle-orm, etc.) are preserved as imports.
 * Internal imports (including @jant/core/i18n from SWC Lingui rewrites) are
 * resolved via package.json exports and bundled inline.
 */

import { defineConfig } from "vite";
import { resolve } from "path";
import { pkg, swcPlugin } from "./vite.shared";

const dir = import.meta.dirname;

export default defineConfig({
  define: {
    __JANT_VERSION__: JSON.stringify(pkg.version),
    // __JANT_DEV__ intentionally omitted — typeof check evaluates to false
  },

  build: {
    lib: {
      entry: resolve(dir, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: (id: string) => {
        if (id.startsWith("@jant/core")) return false; // bundle internal modules
        if (id.startsWith("cloudflare:")) return true;
        if (id === "__STATIC_CONTENT_MANIFEST") return true;
        return Object.keys(pkg.dependencies ?? {}).some(
          (dep: string) => id === dep || id.startsWith(dep + "/"),
        );
      },
    },
    target: "esnext",
    minify: false,
    emptyOutDir: false,
  },

  plugins: [swcPlugin()],
});
