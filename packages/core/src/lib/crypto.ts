/**
 * Compare two byte arrays using a constant-time loop.
 *
 * This avoids relying on runtime-specific crypto helpers so the same behavior
 * works in Node.js and Workers.
 *
 * @param a - First byte array
 * @param b - Second byte array
 * @returns `true` when the inputs are byte-for-byte identical
 *
 * @example
 * ```ts
 * const isEqual = timingSafeEqualBytes(
 *   new TextEncoder().encode("abc"),
 *   new TextEncoder().encode("abc"),
 * );
 * ```
 */
export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.byteLength; index += 1) {
    mismatch |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }

  return mismatch === 0;
}

/**
 * Compare two strings using a constant-time byte comparison.
 *
 * @param a - First string
 * @param b - Second string
 * @returns `true` when the UTF-8 byte sequences are identical
 *
 * @example
 * ```ts
 * const isEqual = timingSafeEqualText("token-a", "token-b");
 * ```
 */
export function timingSafeEqualText(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  return timingSafeEqualBytes(encoder.encode(a), encoder.encode(b));
}
