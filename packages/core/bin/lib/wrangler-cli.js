import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

function resolveWranglerBin(cwd = process.cwd()) {
  const require = createRequire(import.meta.url);
  const fallbackPath = dirname(fileURLToPath(import.meta.url));

  try {
    return require.resolve("wrangler/bin/wrangler.js", {
      paths: [cwd, fallbackPath],
    });
  } catch (error) {
    throw new Error(
      [
        "Unable to resolve a local Wrangler installation.",
        "Install `wrangler` in the current project before running this command.",
      ].join(" "),
      { cause: error },
    );
  }
}

export function runLocalWrangler(args, options = {}) {
  const {
    cwd = process.cwd(),
    encoding = "utf-8",
    env = process.env,
    stdio = "pipe",
    ...execOptions
  } = options;

  return execFileSync(process.execPath, [resolveWranglerBin(cwd), ...args], {
    ...execOptions,
    cwd,
    encoding,
    env,
    stdio,
  });
}
