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

function commandArgument(sql) {
  // Inline the value so SQL that starts with `--` comments is not parsed as
  // additional CLI flags by Wrangler's argument parser.
  return `--command=${sql}`;
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
    return runLocalWrangler(args, options);
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
    const wranglerError = getWranglerError(output);
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
      commandArgument(sql),
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
        commandArgument(sql),
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
