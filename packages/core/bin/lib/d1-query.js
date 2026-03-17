import { execFileSync } from "node:child_process";

function getD1Flag(runtime) {
  return runtime === "d1-remote" ? "--remote" : "--local";
}

function getWranglerError(output) {
  if (!output) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(output.trim());
    if (Array.isArray(parsed)) {
      return parsed[0]?.error?.text;
    }
    return parsed?.error?.text;
  } catch {
    return undefined;
  }
}

function runWrangler(args, options = {}) {
  try {
    return execFileSync("npx", ["wrangler", ...args], {
      encoding: "utf-8",
      stdio: options.stdio ?? "pipe",
    });
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
    const wranglerError = getWranglerError(output);
    if (wranglerError) {
      throw new Error(`Wrangler error: ${wranglerError}`);
    }
    throw new Error(output || error.message, { cause: error });
  }
}

export function executeD1(sql, runtime) {
  runWrangler(
    ["d1", "execute", "DB", getD1Flag(runtime), "--command", sql],
    { stdio: "inherit" },
  );
}

export function queryD1(sql, runtime) {
  const output = runWrangler([
    "d1",
    "execute",
    "DB",
    getD1Flag(runtime),
    "--command",
    sql,
    "--json",
  ]);
  const parsed = JSON.parse(output);
  const statement = Array.isArray(parsed) ? parsed[0] : parsed;

  if (statement?.error?.text) {
    throw new Error(`Wrangler error: ${statement.error.text}`);
  }

  return statement?.results ?? [];
}
