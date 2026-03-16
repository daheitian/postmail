/**
 * Client asset build: produces public/auth JS plus shared CSS assets.
 *
 * Run via: `vite build --config vite.config.client.ts`
 *
 * These assets are served via wrangler [assets] in user projects.
 * Public pages load the lean bundle; authenticated pages opt into the heavier
 * editor/admin bundle.
 */

import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { clientBuildOptions } from "./vite.shared";

export default defineConfig({
  build: {
    ...clientBuildOptions,
    emptyOutDir: true,
    minify: true,
  },

  plugins: [tailwindcss()],
});
