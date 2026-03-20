import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readWranglerString } from "../../demo-shared/wrangler-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DEMO_SOURCE_DIR = resolve(__dirname, "../../../sites/demo-source");
export const DEMO_SOURCE_WRANGLER_PATH = resolve(
  DEMO_SOURCE_DIR,
  "wrangler.toml",
);

function parseWranglerError(output, fallbackMessage) {
  try {
    const parsed = JSON.parse(output.trim());
    if (parsed.error?.text) {
      const detail = parsed.error.notes?.[0]?.text;
      return `${parsed.error.text}${detail ? `\n  ${detail}` : ""}`;
    }
  } catch {
    // Fall through to the generic message below.
  }

  return output || fallbackMessage;
}

export function readDemoSourceConfig(key) {
  return readWranglerString(DEMO_SOURCE_WRANGLER_PATH, key);
}

export function queryDemoSourceRemote(sql) {
  let stdout;

  try {
    stdout = execFileSync(
      "pnpm",
      [
        "exec",
        "wrangler",
        "d1",
        "execute",
        "DB",
        "--remote",
        "--command",
        sql,
        "--json",
      ],
      { encoding: "utf-8", cwd: DEMO_SOURCE_DIR },
    );
  } catch (error) {
    const output = error.stdout || error.stderr || "";
    throw new Error(
      `Failed to query demo-source D1: ${parseWranglerError(output, error.message)}`,
    );
  }

  const parsed = JSON.parse(stdout);
  if (parsed.error?.text) {
    const detail = parsed.error.notes?.[0]?.text;
    throw new Error(
      `Wrangler error: ${parsed.error.text}${detail ? `\n  ${detail}` : ""}`,
    );
  }

  return parsed[0]?.results || [];
}

export function deleteDemoSourceObject(key) {
  const bucketName = readDemoSourceConfig("bucket_name");

  execFileSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "r2",
      "object",
      "delete",
      `${bucketName}/${key}`,
      "--remote",
    ],
    { encoding: "utf-8", cwd: DEMO_SOURCE_DIR },
  );
}
