import { exec } from "child_process";
import type { Plugin } from "vite";

/**
 * Auto-extract and compile i18n catalogs when source files change.
 * Debounced to 500ms so rapid saves don't spawn multiple processes.
 */
export function linguiAutoExtract(): Plugin {
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
 * Full page reload when server-rendered code changes.
 * Client-side modules keep Vite HMR; SSR updates force a browser refresh.
 */
export function ssrReload(): Plugin {
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
