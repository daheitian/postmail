/**
 * Static asset path helpers.
 *
 * Build outputs live under an internal `/_assets` directory, while the public
 * asset base path may be prefixed by the site's deployment path.
 */

import { toPublicPath } from "./url.js";

export const ASSET_BASE_SEGMENT = "_assets";
export const ASSET_BASE_PATH = `/${ASSET_BASE_SEGMENT}`;
export const ASSET_CHUNK_SEGMENT = "chunks";

function normalizeAssetBasePath(basePath: string): string {
  const trimmed = basePath.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return ASSET_BASE_PATH;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Resolve the public asset base path for the current deployment prefix.
 *
 * @param sitePathPrefix - Public site path prefix, such as `/blog`
 * @returns Public asset base path, such as `/blog/_assets`
 */
export function getPublicAssetBasePath(sitePathPrefix = ""): string {
  return toPublicPath(ASSET_BASE_PATH, sitePathPrefix);
}

/**
 * Prefix a static asset subpath with an asset base path.
 *
 * @param path - Asset path relative to the asset base, with or without `/`
 * @param basePath - Asset base path, defaults to the internal `/_assets`
 * @returns Absolute asset URL path
 *
 * @example
 * ```ts
 * toAssetPath("client.js"); // "/_assets/client.js"
 * toAssetPath("client.js", "/blog/_assets"); // "/blog/_assets/client.js"
 * ```
 */
export function toAssetPath(path: string, basePath = ASSET_BASE_PATH): string {
  const normalizedBasePath = normalizeAssetBasePath(basePath);
  const normalized = path.replace(/^\/+/, "");
  return normalized
    ? `${normalizedBasePath}/${normalized}`
    : normalizedBasePath;
}

/**
 * Returns true when a path points at a static asset namespace.
 *
 * @param path - Request pathname
 * @param basePath - Asset base path, defaults to the internal `/_assets`
 * @returns Whether the pathname is inside the asset namespace
 */
export function isAssetPath(path: string, basePath = ASSET_BASE_PATH): boolean {
  const normalizedBasePath = normalizeAssetBasePath(basePath);
  return (
    path === normalizedBasePath || path.startsWith(`${normalizedBasePath}/`)
  );
}

/**
 * Convert an internal asset path into its public deployment path.
 *
 * @param path - Internal or already-public asset path
 * @param publicAssetBasePath - Public asset base path for the current site
 * @returns Public-facing asset path
 */
export function toPublicAssetPath(
  path: string,
  publicAssetBasePath: string,
): string {
  if (isAssetPath(path, publicAssetBasePath)) {
    return path;
  }
  if (!isAssetPath(path)) {
    return path;
  }

  const relativePath = path.slice(ASSET_BASE_PATH.length).replace(/^\/+/, "");
  return toAssetPath(relativePath, publicAssetBasePath);
}
