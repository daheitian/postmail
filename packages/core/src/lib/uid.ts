/**
 * UID — Base58-encoded UUIDv7 identifiers
 *
 * Converts UUIDv7 strings to compact, URL-friendly Base58 representations (~22 chars).
 * UUIDs are internal-only; all user-facing output uses Base58.
 */

import bs58 from "bs58";

/**
 * Converts a UUID string to a Base58-encoded UID.
 *
 * @param uuid - Standard dash-format UUID (e.g. "0192d3e0-7c83-7f1e-...")
 * @returns Base58-encoded string (~22 characters)
 *
 * @example
 * ```ts
 * const uid = toUid("0192d3e0-7c83-7f1e-8a4b-1234567890ab");
 * // Returns: "6BxbNthKq8FzAWjGHPvR2p" (or similar)
 * ```
 */
export function toUid(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bs58.encode(bytes);
}

/**
 * Decodes a Base58-encoded UID back to the original UUID string.
 *
 * @param uid - Base58-encoded UID string
 * @returns Standard dash-format UUID, or `null` if the input is invalid
 *
 * @example
 * ```ts
 * const uuid = fromUid("6BxbNthKq8FzAWjGHPvR2p");
 * // Returns: "0192d3e0-7c83-7f1e-8a4b-1234567890ab"
 *
 * const invalid = fromUid("!!!");
 * // Returns: null
 * ```
 */
export function fromUid(uid: string): string | null {
  try {
    const bytes = bs58.decode(uid);
    if (bytes.length !== 16) return null;
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join("-");
  } catch {
    return null;
  }
}

/**
 * Checks if a string is a valid Base58-encoded UID that decodes to a 16-byte value.
 *
 * @param uid - The string to validate
 * @returns `true` if the string is a valid UID, `false` otherwise
 *
 * @example
 * ```ts
 * if (isValidUid("6BxbNthKq8FzAWjGHPvR2p")) {
 *   // Process the valid UID
 * }
 * ```
 */
export function isValidUid(uid: string): boolean {
  return fromUid(uid) !== null;
}
