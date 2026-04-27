/**
 * RFC4122 v4 UUID generator with fallback for insecure contexts.
 *
 * `crypto.randomUUID()` is only available in secure contexts (HTTPS or
 * localhost). Self-hosted Jant deployments are often accessed over plain
 * HTTP on a LAN address, where the native API is `undefined`. This helper
 * uses the native API when available and falls back to a `Math.random`-based
 * v4 string otherwise. The fallback is not cryptographically strong, but
 * client-side IDs here only need to be unique within a single page session.
 */
export const randomUUID = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
