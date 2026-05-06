const VERIFICATION_HMAC_VERSION = "v1";
const textEncoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Compute the plaintext HMAC token returned from
 * `/.well-known/jant-verification`.
 *
 * The control plane sends a nonce in the query string; the site replies with
 * `jant-verification=<hex>` where `<hex>` is `HMAC-SHA256(secret, payload)`
 * over `payload = "v1:" + host + ":" + nonce`. The shared secret is
 * `HOSTED_CONTROL_PLANE_DOMAIN_CHECK_SECRET`.
 */
export async function computeHostedVerificationToken(
  secret: string,
  host: string,
  nonce: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const payload = `${VERIFICATION_HMAC_VERSION}:${host.trim().toLowerCase()}:${nonce}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload)),
  );
  return bytesToHex(signature);
}
