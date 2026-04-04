import { readFile } from "node:fs/promises";
import { CLI_API_TOKEN_ENV_VAR, getCliApiToken } from "./cli-api-token.js";
import { resolveSiteUrl } from "./site-url.js";

export const DEV_API_TOKEN_ENV_VAR = "DEV_API_TOKEN";

export const sharedApiOptions = {
  config: { type: "string" },
  env: { type: "string" },
  help: { type: "boolean", short: "h" },
  token: { type: "string" },
  url: { type: "string" },
};

function normalizeBaseUrl(value) {
  const trimmed = value.trim();
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function maybeParseJson(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readStdinText() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export function buildApiUrl(siteUrl, path, query) {
  const url = new URL(path.replace(/^\//, ""), normalizeBaseUrl(siteUrl));

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export function resolveRequestUrl(siteUrl, targetUrl) {
  return new URL(targetUrl, normalizeBaseUrl(siteUrl)).toString();
}

export function requireSiteUrl(values, purpose) {
  const siteUrl = resolveSiteUrl({
    url: values.url,
    config: values.config,
    env: values.env,
  });

  if (!siteUrl) {
    throw new Error(
      `${purpose} requires --url or SITE_ORIGIN in the environment or wrangler.toml.`,
    );
  }

  return siteUrl;
}

export function getOptionalApiToken(values) {
  return (
    values.token?.trim() ||
    getCliApiToken(process.env, process.env[DEV_API_TOKEN_ENV_VAR]?.trim()) ||
    ""
  );
}

export function requireApiToken(values, purpose) {
  const token = getOptionalApiToken(values);

  if (!token) {
    throw new Error(
      `${purpose} requires --token or ${CLI_API_TOKEN_ENV_VAR} (or ${DEV_API_TOKEN_ENV_VAR} for local development).`,
    );
  }

  return token;
}

export async function readJsonInput(values) {
  const rawJson = values.json?.trim();
  const inputPath = values.input?.trim();

  if (rawJson && inputPath) {
    throw new Error("Provide either --json or --input, not both.");
  }

  if (!rawJson && !inputPath) {
    throw new Error("Provide --json or --input.");
  }

  const source =
    rawJson ??
    (inputPath === "-" ? await readStdinText() : await readFile(inputPath, "utf8"));

  try {
    return JSON.parse(source);
  } catch {
    const sourceLabel = rawJson
      ? "--json"
      : inputPath === "-"
        ? "stdin"
        : inputPath;
    throw new Error(`Invalid JSON in ${sourceLabel}.`);
  }
}

export async function requestRaw({
  body,
  headers: customHeaders,
  method = "GET",
  path,
  query,
  siteUrl,
  token,
  url,
}) {
  const requestUrl =
    url ?? (siteUrl && path ? buildApiUrl(siteUrl, path, query) : "");
  if (!requestUrl) {
    throw new Error("requestRaw requires either url or siteUrl + path.");
  }

  const headers = {
    ...(customHeaders ?? {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(requestUrl, {
    method,
    headers,
    body,
  });

  const text = await response.text();
  const parsed = maybeParseJson(text);

  if (!response.ok) {
    const message =
      parsed &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof parsed.error === "string"
        ? parsed.error
        : text || response.statusText;
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  return {
    json: parsed,
    response,
    text,
    url: requestUrl,
  };
}

export async function requestJson({
  body,
  method = "GET",
  path,
  query,
  siteUrl,
  token,
  url,
}) {
  const headers = {
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const { json, text } = await requestRaw({
    body: body === undefined ? undefined : JSON.stringify(body),
    headers,
    method,
    path,
    query,
    siteUrl,
    token,
    url,
  });

  if (!text) {
    return null;
  }

  return json ?? text;
}

export function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

export async function runCommand(action) {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}
