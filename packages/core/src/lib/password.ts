/**
 * Password hashing helpers.
 *
 * Uses a custom node:crypto scrypt configuration for Worker deployments while
 * still accepting legacy better-auth hashes.
 */

import { verifyPassword as verifyLegacyPassword } from "better-auth/crypto";

const CUSTOM_SCRYPT_PREFIX = "custom-scrypt";
const CUSTOM_SCRYPT_N = 16_384;
const CUSTOM_SCRYPT_R = 16;
const CUSTOM_SCRYPT_P = 1;
const CUSTOM_SCRYPT_KEY_LENGTH = 64;
const CUSTOM_SCRYPT_SALT_BYTES = 16;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) ?? [];
  return new Uint8Array(pairs.map((pair) => parseInt(pair, 16)));
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.byteLength; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    mismatch |= left ^ right;
  }
  return mismatch === 0;
}

async function deriveScryptKey(
  password: string,
  saltHex: string,
  opts: {
    N: number;
    r: number;
    p: number;
    dkLen: number;
  },
): Promise<Uint8Array> {
  const normalizedPassword = password.normalize("NFKC");
  const { scrypt } = await import("node:crypto");
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      normalizedPassword,
      saltHex,
      opts.dkLen,
      {
        N: opts.N,
        r: opts.r,
        p: opts.p,
        maxmem: 128 * opts.N * opts.r * 2,
      },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(key as Buffer);
      },
    );
  });

  return new Uint8Array(derived);
}

/**
 * Hash a plaintext password.
 *
 * @param password - Plaintext password
 * @returns Encoded password hash
 *
 * @example
 * ```ts
 * const hash = await hashPassword("correct horse battery staple");
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(CUSTOM_SCRYPT_SALT_BYTES));
  const saltHex = bytesToHex(salt);
  const derivedKey = await deriveScryptKey(password, saltHex, {
    N: CUSTOM_SCRYPT_N,
    r: CUSTOM_SCRYPT_R,
    p: CUSTOM_SCRYPT_P,
    dkLen: CUSTOM_SCRYPT_KEY_LENGTH,
  });

  return [
    CUSTOM_SCRYPT_PREFIX,
    String(CUSTOM_SCRYPT_N),
    String(CUSTOM_SCRYPT_R),
    String(CUSTOM_SCRYPT_P),
    String(CUSTOM_SCRYPT_KEY_LENGTH),
    saltHex,
    bytesToHex(derivedKey),
  ].join("$");
}

/**
 * Verify a plaintext password against the stored hash.
 *
 * Accepts custom scrypt hashes and legacy better-auth scrypt hashes.
 *
 * @param data - Stored hash and plaintext password
 * @returns `true` when the password matches the stored hash
 *
 * @example
 * ```ts
 * const isValid = await verifyPassword({ hash, password: "secret" });
 * ```
 */
export async function verifyPassword(data: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const parts = data.hash.split("$");
  if (parts[0] === CUSTOM_SCRYPT_PREFIX) {
    const [, nRaw, rRaw, pRaw, keyLengthRaw, saltHex, expectedHex] = parts;
    if (!nRaw || !rRaw || !pRaw || !keyLengthRaw || !saltHex || !expectedHex) {
      return false;
    }

    const N = parseInt(nRaw, 10);
    const r = parseInt(rRaw, 10);
    const p = parseInt(pRaw, 10);
    const dkLen = parseInt(keyLengthRaw, 10);

    if (
      !Number.isFinite(N) ||
      !Number.isFinite(r) ||
      !Number.isFinite(p) ||
      !Number.isFinite(dkLen) ||
      N <= 1 ||
      r <= 0 ||
      p <= 0 ||
      dkLen <= 0
    ) {
      return false;
    }

    const derivedKey = await deriveScryptKey(data.password, saltHex, {
      N,
      r,
      p,
      dkLen,
    });
    const expectedKey = hexToBytes(expectedHex);

    return equalBytes(derivedKey, expectedKey);
  }

  return verifyLegacyPassword(data);
}
