import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate as drizzleMigrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, mkdirSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as schema from "../db/schema.js";
import { ASSET_BASE_PATH } from "../lib/asset-path.js";
import { getEnvString, getSiteUrl, shouldTrustProxy } from "../lib/env.js";
import type { App } from "../types/app-context.js";
import type { Bindings } from "../types/bindings.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function getProcessBindings(): Bindings {
  return process.env as unknown as Bindings;
}

function findExistingPath(candidates: string[], label: string): string {
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`${label} not found. Build @jant/core before running Node.`);
}

function getForwardedValue(
  headerValue: string | null,
  key: "host" | "proto",
): string | undefined {
  if (!headerValue) {
    return undefined;
  }

  const firstEntry = headerValue.split(",")[0]?.trim();
  if (!firstEntry) {
    return undefined;
  }

  for (const part of firstEntry.split(";")) {
    const [rawName, rawValue] = part.split("=", 2);
    if (!rawName || !rawValue) {
      continue;
    }

    if (rawName.trim().toLowerCase() !== key) {
      continue;
    }

    return rawValue.trim().replace(/^"|"$/g, "");
  }

  return undefined;
}

function getFirstHeaderValue(headerValue: string | null): string | undefined {
  return headerValue?.split(",")[0]?.trim() || undefined;
}

function normalizeProxyProtocol(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.endsWith(":") ? value : `${value}:`;
}

function getMimeType(pathname: string): string {
  return (
    MIME_TYPES[extname(pathname).toLowerCase()] ?? "application/octet-stream"
  );
}

function getDefaultPortForProtocol(protocol: string): string {
  return protocol === "https:" ? "443" : "80";
}

function resolveHostWithForwardedPort(
  host: string | undefined,
  forwardedPort: string | undefined,
  protocol: string,
): string | undefined {
  if (!host) {
    return undefined;
  }
  if (!forwardedPort || forwardedPort === getDefaultPortForProtocol(protocol)) {
    return host;
  }
  if (host.startsWith("[") || host.includes(":")) {
    return host;
  }
  return `${host}:${forwardedPort}`;
}

function applyHostToUrl(url: URL, host: string): void {
  const parsed = new URL(`http://${host}`);
  url.hostname = parsed.hostname;
  url.port = parsed.port;
}

export function resolveNodeAssetRoot(moduleUrl = import.meta.url): string {
  return findExistingPath(
    [
      fileURLToPath(new URL("./client/jant-assets", moduleUrl).href),
      fileURLToPath(new URL("../../dist/client/jant-assets", moduleUrl).href),
    ],
    "Node asset directory",
  );
}

export function resolveNodeMigrationsDir(moduleUrl = import.meta.url): string {
  return findExistingPath(
    [
      fileURLToPath(new URL("../db/migrations", moduleUrl).href),
      fileURLToPath(new URL("../src/db/migrations", moduleUrl).href),
    ],
    "Migration directory",
  );
}

export function resolveDatabasePath(
  databaseUrl: string,
  cwd = process.cwd(),
): string {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set. Example: DATABASE_URL=file:./data/jant.sqlite",
    );
  }

  if (databaseUrl === ":memory:" || databaseUrl === "file::memory:") {
    return ":memory:";
  }

  if (!databaseUrl.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL must use the file: scheme in v1. Example: file:/var/lib/jant/jant.sqlite",
    );
  }

  if (databaseUrl.startsWith("file://")) {
    return fileURLToPath(new URL(databaseUrl).href);
  }

  const rawPath = decodeURIComponent(databaseUrl.slice("file:".length));
  if (!rawPath) {
    throw new Error("DATABASE_URL points to an empty SQLite path.");
  }
  if (rawPath === ":memory:") {
    return ":memory:";
  }

  return isAbsolute(rawPath) ? rawPath : resolve(cwd, rawPath);
}

export function resolveNodeDataDir(
  env: Bindings,
  options?: { cwd?: string; defaultDataDir?: string },
): string | undefined {
  const cwd = options?.cwd ?? process.cwd();
  const configured = getEnvString(env, "DATA_DIR");
  const candidate = configured ?? options?.defaultDataDir;
  if (!candidate) {
    return undefined;
  }

  return isAbsolute(candidate) ? candidate : resolve(cwd, candidate);
}

export function applyNodeRuntimeEnvDefaults(
  env: Bindings,
  options?: { cwd?: string; defaultDataDir?: string },
): void {
  const cwd = options?.cwd ?? process.cwd();
  let dataDir = resolveNodeDataDir(env, { cwd });

  if (!dataDir) {
    const configuredDatabaseUrl = getEnvString(env, "DATABASE_URL");
    if (configuredDatabaseUrl) {
      const databasePath = resolveDatabasePath(configuredDatabaseUrl, cwd);
      if (databasePath !== ":memory:") {
        dataDir = dirname(databasePath);
      }
    }
  }

  if (!dataDir) {
    dataDir = resolveNodeDataDir(env, {
      cwd,
      defaultDataDir: options?.defaultDataDir,
    });
  }

  if (!dataDir) {
    return;
  }

  if (!getEnvString(env, "DATA_DIR")) {
    env.DATA_DIR = dataDir;
  }

  if (!getEnvString(env, "DATABASE_URL")) {
    env.DATABASE_URL = pathToFileURL(join(dataDir, "jant.sqlite")).href;
  }

  if (!getEnvString(env, "LOCAL_STORAGE_PATH")) {
    env.LOCAL_STORAGE_PATH = join(dataDir, "media");
  }
}

function ensureParentDirectory(databasePath: string): void {
  if (databasePath === ":memory:") {
    return;
  }

  mkdirSync(dirname(databasePath), { recursive: true });
}

function applySqlitePragmas(sqlite: Database.Database): void {
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
}

function assertSqliteSearchCapabilities(sqlite: Database.Database): void {
  try {
    sqlite.exec(`
      CREATE VIRTUAL TABLE temp.jant_fts_capability_check USING fts5(
        content,
        tokenize='trigram'
      );
      DROP TABLE temp.jant_fts_capability_check;
    `);
  } catch (error) {
    try {
      sqlite.exec("DROP TABLE IF EXISTS temp.jant_fts_capability_check");
    } catch {
      // ignore cleanup failures
    }

    throw new Error(
      "SQLite must support FTS5 with the trigram tokenizer. Install a better-sqlite3 build with trigram enabled.",
      { cause: error },
    );
  }
}

function assertDatabaseInitialized(sqlite: Database.Database): void {
  const hasSettingsTable = sqlite
    .prepare(
      `
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table' AND name = 'setting'
        LIMIT 1
      `,
    )
    .pluck()
    .get();

  if (!hasSettingsTable) {
    throw new Error(
      "Database is not initialized. Run `jant migrate` before `jant start`.",
    );
  }
}

function createNodeSqlite(
  env: Bindings,
  options?: { createParentDir?: boolean; requireInitialized?: boolean },
): Database.Database {
  applyNodeRuntimeEnvDefaults(env, { defaultDataDir: "data" });
  const databasePath = resolveDatabasePath(
    getEnvString(env, "DATABASE_URL") ?? "",
  );
  if (options?.createParentDir) {
    ensureParentDirectory(databasePath);
  }

  const sqlite = new Database(databasePath);
  applySqlitePragmas(sqlite);
  assertSqliteSearchCapabilities(sqlite);

  if (options?.requireInitialized) {
    assertDatabaseInitialized(sqlite);
  }

  return sqlite;
}

export function resolveHost(env: Bindings): string {
  return getEnvString(env, "HOST") ?? DEFAULT_HOST;
}

export function resolvePort(env: Bindings): number {
  const rawPort = getEnvString(env, "PORT");
  if (!rawPort) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

export function resolvePublicRequestUrl(
  request: Request,
  env: Bindings,
): string {
  const requestUrl = new URL(request.url);
  const siteUrl = getSiteUrl(env);

  if (siteUrl) {
    const canonicalUrl = new URL(siteUrl);
    requestUrl.protocol = canonicalUrl.protocol;
    requestUrl.hostname = canonicalUrl.hostname;
    requestUrl.port = canonicalUrl.port;
    return requestUrl.toString();
  }

  if (!shouldTrustProxy(env)) {
    return requestUrl.toString();
  }

  const protocol =
    normalizeProxyProtocol(
      getForwardedValue(request.headers.get("forwarded"), "proto") ??
        getFirstHeaderValue(request.headers.get("x-forwarded-proto")),
    ) ?? requestUrl.protocol;
  const host = resolveHostWithForwardedPort(
    getForwardedValue(request.headers.get("forwarded"), "host") ??
      getFirstHeaderValue(request.headers.get("x-forwarded-host")) ??
      request.headers.get("host") ??
      requestUrl.host,
    getFirstHeaderValue(request.headers.get("x-forwarded-port")),
    protocol,
  );

  requestUrl.protocol = protocol;
  if (host) {
    applyHostToUrl(requestUrl, host);
  }
  return requestUrl.toString();
}

async function serveStaticAsset(
  request: Request,
  assetRoot: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(`${ASSET_BASE_PATH}/`)) {
    return null;
  }

  let relativePath: string;
  try {
    relativePath = decodeURIComponent(
      url.pathname.slice(ASSET_BASE_PATH.length),
    );
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  const candidatePath = resolve(assetRoot, `.${relativePath}`);
  const safeRelativePath = relative(assetRoot, candidatePath);
  if (
    !safeRelativePath ||
    safeRelativePath.startsWith("..") ||
    isAbsolute(safeRelativePath)
  ) {
    return new Response("Not Found", { status: 404 });
  }

  let fileStat;
  try {
    fileStat = await stat(candidatePath);
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  if (!fileStat.isFile()) {
    return new Response("Not Found", { status: 404 });
  }

  const etag = `W/"${fileStat.size}-${fileStat.mtimeMs}"`;
  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, {
      status: 304,
      headers: new Headers({
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: etag,
      }),
    });
  }

  return new Response(await readFile(candidatePath), {
    headers: new Headers({
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(fileStat.size),
      "Content-Type": getMimeType(candidatePath),
      ETag: etag,
      "Last-Modified": fileStat.mtime.toUTCString(),
    }),
  });
}

function createNodeBindings(
  env: Bindings,
  sqlite: Database.Database,
): Bindings {
  return {
    ...env,
    NODE_SQLITE: sqlite,
  };
}

export function migrate(env: Bindings = getProcessBindings()): void {
  const sqlite = createNodeSqlite(env, { createParentDir: true });

  try {
    const db = drizzle(sqlite, { schema });
    drizzleMigrate(db, { migrationsFolder: resolveNodeMigrationsDir() });
  } finally {
    sqlite.close();
  }
}

export type NodeAppResolver = App | (() => App | Promise<App>);

export interface NodeRequestHandler {
  close(): Promise<void>;
  fetch(request: Request): Promise<Response>;
}

async function resolveApp(app: NodeAppResolver | undefined): Promise<App> {
  if (typeof app === "function") {
    return app();
  }

  if (app) {
    return app;
  }

  throw new Error("Node request handler requires an app instance or loader.");
}

export async function createNodeRequestHandler(options?: {
  env?: Bindings;
  app?: NodeAppResolver;
  assetRoot?: string | null;
}): Promise<NodeRequestHandler> {
  const env = options?.env ?? getProcessBindings();
  const sqlite = createNodeSqlite(env, { requireInitialized: true });
  const bindings = createNodeBindings(env, sqlite);
  const assetRoot =
    options?.assetRoot === undefined
      ? resolveNodeAssetRoot()
      : options.assetRoot;

  let closed = false;

  return {
    async fetch(request: Request) {
      const publicRequestUrl = resolvePublicRequestUrl(request, bindings);
      const preparedRequest =
        publicRequestUrl === request.url
          ? request
          : new Request(publicRequestUrl, request);

      if (assetRoot) {
        const staticResponse = await serveStaticAsset(
          preparedRequest,
          assetRoot,
        );
        if (staticResponse) {
          return staticResponse;
        }
      }

      const app = await resolveApp(options?.app);
      return app.fetch(preparedRequest, bindings);
    },
    async close() {
      if (closed) {
        return;
      }

      closed = true;
      sqlite.close();
    },
  };
}
