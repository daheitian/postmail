/**
 * GitHub webhook HMAC-SHA256 signature verification.
 *
 * Uses the Web Crypto API — works in both Cloudflare Workers and Node 18+.
 */

/**
 * Verify a GitHub webhook payload signature.
 *
 * @param payload - Raw request body (string or ArrayBuffer)
 * @param signature - The `X-Hub-Signature-256` header value (e.g. `sha256=abc...`)
 * @param secret - The webhook secret configured when the hook was created
 * @returns `true` if the signature is valid
 *
 * @example
 * ```ts
 * const valid = await verifyGitHubWebhookSignature(rawBody, header, secret);
 * if (!valid) return new Response("Unauthorized", { status: 401 });
 * ```
 */
export async function verifyGitHubWebhookSignature(
  payload: string | ArrayBuffer,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature.startsWith("sha256=")) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const payloadBytes =
    typeof payload === "string" ? encoder.encode(payload) : payload;
  const mac = await crypto.subtle.sign("HMAC", key, payloadBytes);

  const expected = hexToBytes(signature.slice(7));
  if (!expected) return false;

  return timingSafeEqual(new Uint8Array(mac), expected);
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) return null;
    bytes[i / 2] = byte;
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= (a[i] as number) ^ (b[i] as number);
  }
  return mismatch === 0;
}
