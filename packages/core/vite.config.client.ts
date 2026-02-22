/**
 * Client asset build: produces client.js + client.css.
 *
 * Run via: `vite build --config vite.config.client.ts`
 *
 * These two files are served via wrangler [assets] in the worker-starter template.
 * Contains all interactive JS (Datastar, Lit components) and CSS (Tailwind + BaseCoat).
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
