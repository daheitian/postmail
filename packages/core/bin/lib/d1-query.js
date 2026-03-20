import { runLocalWrangler } from "./wrangler-cli.js";

function getD1Flag(runtime) {
  return runtime === "d1-remote" ? "--remote" : "--local";
}

function appendWranglerContext(args, options = {}) {
  if (options.configPath) {
    args.push("--config", options.configPath);
  }

  if (options.env) {
    args.push("--env", options.env);
  }

  if (options.persistTo) {
    args.push("--persist-to", options.persistTo);
  }

  return args;
}

export function parseWranglerError(output) {
  if (!output) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(output.trim());
    const error = Array.isArray(parsed) ? parsed[0]?.error : parsed?.error;
    if (!error?.text) {
      return undefined;
    }

    const notes = Array.isArray(error.notes)
      ? error.notes
          .map((note) => note?.text)
          .filter((text) => typeof text === "string" && text.length > 0)
      : [];
    const suffix = notes.length > 0 ? ` (${notes.join(" | ")})` : "";
    return `${error.text}${suffix}`;
  } catch {
    return undefined;
  }
}

function runWrangler(args, options = {}) {
  try {
    return runLocalWrangler(args, options);
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
    const wranglerError = parseWranglerError(output);
    if (wranglerError) {
      throw new Error(`Wrangler error: ${wranglerError}`);
    }
    throw new Error(output || error.message, { cause: error });
  }
}

export function executeD1(sql, runtime, options = {}) {
  const args = appendWranglerContext(
    [
      "d1",
      "execute",
      options.database ?? "DB",
      getD1Flag(runtime),
      `--command=${sql}`,
    ],
    options,
  );

  if (options.quiet) {
    const output = runWrangler([...args, "--json"]);
    const parsed = JSON.parse(output);
    const statements = Array.isArray(parsed) ? parsed : [parsed];

    for (const statement of statements) {
      if (statement?.error?.text) {
        throw new Error(`Wrangler error: ${statement.error.text}`);
      }
    }

    return statements;
  }

  runWrangler(args, { stdio: "inherit" });
}

export function executeD1File(filePath, runtime, options = {}) {
  const args = appendWranglerContext(
    [
      "d1",
      "execute",
      options.database ?? "DB",
      getD1Flag(runtime),
      "--file",
      filePath,
    ],
    options,
  );

  if (options.quiet) {
    const output = runWrangler([...args, "--json"]);
    const parsed = JSON.parse(output);
    const statements = Array.isArray(parsed) ? parsed : [parsed];

    for (const statement of statements) {
      if (statement?.error?.text) {
        throw new Error(`Wrangler error: ${statement.error.text}`);
      }
    }

    return statements;
  }

  runWrangler(args, { stdio: "inherit" });
}

export function queryD1(sql, runtime, options = {}) {
  const output = runWrangler(
    appendWranglerContext(
      [
        "d1",
        "execute",
        options.database ?? "DB",
        getD1Flag(runtime),
        `--command=${sql}`,
        "--json",
      ],
      options,
    ),
  );
  const parsed = JSON.parse(output);
  const statement = Array.isArray(parsed) ? parsed[0] : parsed;

  if (statement?.error?.text) {
    throw new Error(`Wrangler error: ${statement.error.text}`);
  }

  return statement?.results ?? [];
}
