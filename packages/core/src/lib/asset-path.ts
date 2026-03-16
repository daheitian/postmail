/**
 * Static asset path helpers.
 *
 * Client build artifacts are always served from a reserved root path so they
 * stay reachable even when the site itself is mounted under a path prefix.
 */

export const ASSET_BASE_SEGMENT = "jant-assets";
export const ASSET_BASE_PATH = `/${ASSET_BASE_SEGMENT}`;

/**
 * Prefix a static asset subpath with the reserved asset base path.
 *
 * @param path - Asset path relative to the asset base, with or without `/`
 * @returns Absolute asset URL path
 *
 * @example
 * ```ts
 * toAssetPath("client.js"); // "/jant-assets/client.js"
 * toAssetPath("/@vite/client"); // "/jant-assets/@vite/client"
 * ```
 */
export function toAssetPath(path: string): string {
  const normalized = path.replace(/^\/+/, "");
  return normalized ? `${ASSET_BASE_PATH}/${normalized}` : ASSET_BASE_PATH;
}

/**
 * Returns true when a path points at the reserved static asset namespace.
 *
 * @param path - Request pathname
 * @returns Whether the pathname is inside the asset namespace
 */
export function isAssetPath(path: string): boolean {
  return path === ASSET_BASE_PATH || path.startsWith(`${ASSET_BASE_PATH}/`);
}
