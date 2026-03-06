/**
 * Random ID Generation
 *
 * Wraps nanoid's `customAlphabet` to produce short, URL-safe random IDs
 * using a lowercase alphanumeric alphabet (0-9, a-z).
 */

import { customAlphabet } from "nanoid";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/**
 * Generates a random ID of the given length using lowercase alphanumeric characters.
 *
 * Uses nanoid's `customAlphabet` for uniform distribution.
 *
 * @param length - Number of characters in the generated ID
 * @returns Random alphanumeric string
 *
 * @example
 * ```ts
 * generateRandomId(5); // e.g. "a3k9m"
 * generateRandomId(8); // e.g. "b7x2q4fn"
 * ```
 */
export function generateRandomId(length: number): string {
  const generate = customAlphabet(ALPHABET, length);
  return generate();
}
