import { createHash } from "node:crypto";
import http from "node:http";
import https from "node:https";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative } from "node:path";
import { unzipSync, zipSync } from "fflate";
import { parse, stringify } from "smol-toml";
import {
  collectMediaReferences as collectParsedMediaReferences,
  isSkippableUrl,
  rewriteMediaReferences,
} from "./site-media-parser.js";

export function getSitePathPrefix(baseUrl) {
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
    return "";
  }

  try {
    const pathname = new URL(baseUrl).pathname.replace(/\/+$/, "");
    return pathname === "/" ? "" : pathname;
  } catch {
    return "";
  }
}

export function resolveExportUrl(rawUrl, baseUrl) {
  if (isSkippableUrl(rawUrl)) {
    return null;
  }

  try {
    if (typeof rawUrl === "string" && rawUrl.startsWith("//")) {
      return `https:${rawUrl}`;
    }
    return new URL(rawUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

export function toLocalizedPublicPath(relativePath, sitePathPrefix = "") {
  const trimmedPath = String(relativePath).replace(/^\/+/, "");
  const prefix = sitePathPrefix.replace(/\/+$/, "");
  if (!prefix) {
    return `/${trimmedPath}`;
  }
  return `${prefix}/${trimmedPath}`.replace(/\/{2,}/g, "/");
}

function sanitizeFilenamePart(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function guessExtensionFromContentType(contentType) {
  switch ((contentType || "").split(";")[0].trim().toLowerCase()) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/avif":
      return ".avif";
    case "image/svg+xml":
      return ".svg";
    case "image/x-icon":
      return ".ico";
    case "video/mp4":
      return ".mp4";
    case "audio/mpeg":
      return ".mp3";
    case "audio/ogg":
      return ".ogg";
    case "application/pdf":
      return ".pdf";
    case "text/plain":
      return ".txt";
    case "text/markdown":
      return ".md";
    case "text/csv":
      return ".csv";
    case "application/json":
    case "text/x-tiptap+json":
      return ".json";
    default:
      return "";
  }
}

function createLocalizedRelativePath(resolvedUrl, contentType, usedPaths) {
  let fileName = "file";

  try {
    const url = new URL(resolvedUrl);
    fileName = sanitizeFilenamePart(basename(url.pathname)) || "file";
  } catch {
    fileName = "file";
  }

  const currentExt = extname(fileName);
  if (!currentExt) {
    fileName += guessExtensionFromContentType(contentType);
  }

  const hash = createHash("sha256")
    .update(resolvedUrl)
    .digest("hex")
    .slice(0, 12);
  const stem = extname(fileName)
    ? fileName.slice(0, -extname(fileName).length)
    : fileName;
  const extension = extname(fileName);
  let relativePath = `media/${hash}-${stem}${extension}`;
  let suffix = 1;

  while (usedPaths.has(relativePath)) {
    relativePath = `media/${hash}-${stem}-${suffix}${extension}`;
    suffix += 1;
  }

  usedPaths.add(relativePath);
  return relativePath;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatAssetRequestError(error) {
  if (!error) {
    return "Download failed";
  }

  if (typeof error === "string") {
    return error;
  }

  const code =
    typeof error === "object" && error && "code" in error ? error.code : "";
  const message =
    typeof error === "object" && error && "message" in error
      ? error.message
      : "";

  if (code && message) {
    return `${code}: ${message}`;
  }
  if (code) {
    return String(code);
  }
  if (message) {
    return String(message);
  }
  return "Download failed";
}

function requestAssetWithNode(url, redirectCount = 0) {
  const maxRedirects = 5;

  return new Promise((resolve) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      resolve({ error: `Invalid URL: ${url}` });
      return;
    }

    const client =
      parsedUrl.protocol === "https:"
        ? https
        : parsedUrl.protocol === "http:"
          ? http
          : null;
    if (!client) {
      resolve({ error: `Unsupported protocol: ${parsedUrl.protocol}` });
      return;
    }

    const request = client.get(
      parsedUrl,
      {
        headers: {
          accept: "*/*",
          "user-agent": "jant-site-export/1.0",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;

        if (
          location &&
          [301, 302, 303, 307, 308].includes(status) &&
          redirectCount < maxRedirects
        ) {
          response.resume();
          resolve(
            requestAssetWithNode(
              new URL(location, parsedUrl).toString(),
              redirectCount + 1,
            ),
          );
          return;
        }

        if (status < 200 || status >= 300) {
          response.resume();
          resolve({ error: `HTTP ${status}` });
          return;
        }

        const chunks = [];
        let totalLength = 0;

        response.on("data", (chunk) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          chunks.push(buffer);
          totalLength += buffer.length;
        });

        response.on("end", () => {
          const bytes = new Uint8Array(totalLength);
          let offset = 0;

          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }

          resolve({
            bytes,
            contentType: response.headers["content-type"]?.split(";")[0] || "",
          });
        });

        response.on("error", (error) => {
          resolve({ error: formatAssetRequestError(error) });
        });
      },
    );

    request.on("error", (error) => {
      resolve({ error: formatAssetRequestError(error) });
    });

    request.setTimeout(30000, () => {
      request.destroy(
        Object.assign(new Error("Request timed out"), { code: "ETIMEDOUT" }),
      );
    });
  });
}

async function fetchAsset(resolvedUrl, options = {}) {
  const maxAttempts =
    Number.isInteger(options.maxAttempts) && options.maxAttempts > 0
      ? options.maxAttempts
      : 3;

  let lastError = "Unknown download failure";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await requestAssetWithNode(resolvedUrl);
    if (!("error" in result)) {
      return result;
    }

    lastError = result.error;
    if (
      attempt < maxAttempts &&
      /^(HTTP (408|425|429|500|502|503|504)|E[A-Z_]+:|UND_ERR_)/.test(lastError)
    ) {
      await sleep(150 * attempt);
      continue;
    }

    return { error: lastError };
  }

  return { error: lastError };
}

async function walkFiles(rootDir) {
  const files = [];

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

async function readMarkdownFiles(rootDir) {
  const files = await walkFiles(join(rootDir, "content")).catch(() => []);
  return files.filter((filePath) => filePath.endsWith(".md"));
}

export function collectMediaReferences(content) {
  return collectParsedMediaReferences(content);
}

function getConfigMediaUrls(siteConfig) {
  const jant = siteConfig?.extra?.jant || {};
  const refs = [];

  if (typeof jant.site_avatar_url === "string") {
    refs.push(jant.site_avatar_url);
  }
  if (typeof jant.apple_touch_icon_url === "string") {
    refs.push(jant.apple_touch_icon_url);
  }
  if (typeof jant.favicon_url === "string") {
    refs.push(jant.favicon_url);
  }

  return refs.filter((ref) => !isSkippableUrl(ref));
}

export function updateConfigMediaUrls(siteConfig, replacements) {
  const jant = siteConfig?.extra?.jant;
  if (!jant || typeof jant !== "object") {
    return false;
  }

  let changed = false;
  for (const key of [
    "site_avatar_url",
    "apple_touch_icon_url",
    "favicon_url",
  ]) {
    if (typeof jant[key] !== "string") continue;
    const nextValue = replacements.get(jant[key]);
    if (!nextValue || nextValue === jant[key]) continue;
    jant[key] = nextValue;
    changed = true;
  }

  return changed;
}

async function resolveExistingLocalizedPath(
  rawUrl,
  baseUrl,
  sitePathPrefix,
  rootDir,
) {
  const resolvedUrl = resolveExportUrl(rawUrl, baseUrl);
  if (!resolvedUrl) {
    return null;
  }

  let pathname = "";
  try {
    pathname = new URL(resolvedUrl).pathname;
  } catch {
    return null;
  }

  if (sitePathPrefix && pathname.startsWith(`${sitePathPrefix}/`)) {
    pathname = pathname.slice(sitePathPrefix.length + 1);
  } else {
    pathname = pathname.replace(/^\/+/, "");
  }

  if (!pathname.startsWith("media/")) {
    return null;
  }

  const fullPath = join(rootDir, "static", pathname);
  const fileStat = await stat(fullPath).catch(() => null);
  if (!fileStat?.isFile()) {
    return null;
  }

  return toLocalizedPublicPath(pathname, sitePathPrefix);
}

async function packDirectoryToZip(rootDir) {
  const files = {};
  const allFiles = await walkFiles(rootDir);

  for (const fullPath of allFiles) {
    const relPath = relative(rootDir, fullPath).replace(/\\/g, "/");
    files[relPath] = new Uint8Array(await readFile(fullPath));
  }

  return zipSync(files);
}

async function unpackZipToDirectory(zipBytes, rootDir) {
  const files = unzipSync(zipBytes);
  await Promise.all(
    Object.entries(files).map(async ([relPath, bytes]) => {
      const fullPath = join(rootDir, relPath);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, bytes);
    }),
  );
}

export async function localizeSiteExportDirectory(rootDir, options = {}) {
  const logger =
    typeof options.logger === "function" ? options.logger : () => {};
  const configPath = join(rootDir, "config.toml");
  const configText = await readFile(configPath, "utf-8");
  const siteConfig = parse(configText);
  const baseUrl =
    typeof siteConfig.base_url === "string" ? siteConfig.base_url : "";
  const sitePathPrefix = getSitePathPrefix(baseUrl);
  const markdownFiles = await readMarkdownFiles(rootDir);
  const usedLocalizedPaths = new Set();
  const rewrites = new Map();
  const localizedByResolvedUrl = new Map();
  const stats = {
    downloaded: 0,
    reused: 0,
    failed: 0,
    filesUpdated: 0,
    configUpdated: false,
  };

  const allReferences = [];
  for (const filePath of markdownFiles) {
    const content = await readFile(filePath, "utf-8");
    allReferences.push(...collectMediaReferences(content));
  }
  allReferences.push(...getConfigMediaUrls(siteConfig));
  const uniqueReferences = [...new Set(allReferences)];

  logger({
    type: "scan-complete",
    markdownFiles: markdownFiles.length,
    mediaReferences: uniqueReferences.length,
  });

  for (const [index, rawUrl] of uniqueReferences.entries()) {
    if (rewrites.has(rawUrl)) {
      continue;
    }

    const existingPath = await resolveExistingLocalizedPath(
      rawUrl,
      baseUrl,
      sitePathPrefix,
      rootDir,
    );
    if (existingPath) {
      rewrites.set(rawUrl, existingPath);
      stats.reused += 1;
      logger({
        type: "asset-reused",
        index: index + 1,
        total: uniqueReferences.length,
        rawUrl,
        localizedPath: existingPath,
      });
      continue;
    }

    const resolvedUrl = resolveExportUrl(rawUrl, baseUrl);
    if (!resolvedUrl) {
      continue;
    }

    if (localizedByResolvedUrl.has(resolvedUrl)) {
      const cachedPath = localizedByResolvedUrl.get(resolvedUrl);
      if (cachedPath) {
        rewrites.set(rawUrl, cachedPath);
      }
      continue;
    }

    let asset = null;
    let assetError = "";
    if (typeof options.assetLoader === "function") {
      asset = await options.assetLoader({
        rawUrl,
        resolvedUrl,
        baseUrl,
        sitePathPrefix,
      });
    }
    if (!asset) {
      const fetched = await fetchAsset(resolvedUrl);
      if ("error" in fetched) {
        assetError = fetched.error;
      } else {
        asset = fetched;
      }
    }
    if (!asset) {
      localizedByResolvedUrl.set(resolvedUrl, null);
      stats.failed += 1;
      logger({
        type: "asset-failed",
        index: index + 1,
        total: uniqueReferences.length,
        rawUrl,
        resolvedUrl,
        error: assetError || "Download failed",
      });
      continue;
    }

    const relativePath = createLocalizedRelativePath(
      resolvedUrl,
      asset.contentType,
      usedLocalizedPaths,
    );
    const outputPath = join(rootDir, "static", relativePath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, asset.bytes);

    const localizedPath = toLocalizedPublicPath(relativePath, sitePathPrefix);
    localizedByResolvedUrl.set(resolvedUrl, localizedPath);
    rewrites.set(rawUrl, localizedPath);
    stats.downloaded += 1;
    logger({
      type: "asset-downloaded",
      index: index + 1,
      total: uniqueReferences.length,
      rawUrl,
      localizedPath,
    });
  }

  for (const filePath of markdownFiles) {
    const content = await readFile(filePath, "utf-8");
    const updatedContent = rewriteMediaReferences(content, rewrites);
    if (updatedContent !== content) {
      await writeFile(filePath, updatedContent);
      stats.filesUpdated += 1;
    }
  }

  if (updateConfigMediaUrls(siteConfig, rewrites)) {
    await writeFile(configPath, stringify(siteConfig));
    stats.configUpdated = true;
  }

  logger({
    type: "rewrite-complete",
    filesUpdated: stats.filesUpdated,
    configUpdated: stats.configUpdated,
  });

  return stats;
}

export async function localizeSiteExportZipBytes(zipBytes, options = {}) {
  const tempDir = await mkdtemp(join(tmpdir(), "jant-site-localize-"));

  try {
    await unpackZipToDirectory(zipBytes, tempDir);
    const stats = await localizeSiteExportDirectory(tempDir, options);
    const localizedZip = await packDirectoryToZip(tempDir);
    return { zipBytes: localizedZip, stats };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
