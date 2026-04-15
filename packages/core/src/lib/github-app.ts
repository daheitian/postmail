/**
 * GitHub App authentication helpers.
 *
 * Implements the App → installation token exchange using Web Crypto so it
 * runs unchanged in Cloudflare Workers and Node 18+.
 *
 * Flow:
 *  1. Sign a short-lived JWT with the App's RSA private key (RS256).
 *  2. Exchange the JWT for a per-installation access token.
 *  3. Cache the installation token in-process until shortly before expiry.
 *
 * The installation token can then be passed to `createGitHubClient` the same
 * way a PAT is — the downstream client is auth-agnostic.
 */

import type { GitHubAppEnvConfig } from "./env.js";

const GITHUB_API = "https://api.github.com";

// ---------------------------------------------------------------------------
// Installation token cache
// ---------------------------------------------------------------------------

interface CachedToken {
  token: string;
  /** Unix seconds when the cached token should be considered expired. */
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();
const CACHE_SAFETY_MARGIN_SECONDS = 60;

function cacheKey(appId: string, installationId: string): string {
  return `${appId}:${installationId}`;
}

// ---------------------------------------------------------------------------
// JWT signing (RS256 via Web Crypto)
// ---------------------------------------------------------------------------

function base64UrlEncode(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    bytes = new Uint8Array(input);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i] as number);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * ASN.1 DER length encoding (short form for < 128, long form otherwise).
 * Used to wrap a PKCS#1 key inside a PKCS#8 envelope.
 */
function encodeDerLength(len: number): number[] {
  if (len < 0x80) return [len];
  if (len <= 0xff) return [0x81, len];
  if (len <= 0xffff) return [0x82, (len >> 8) & 0xff, len & 0xff];
  throw new Error("Private key too large to encode");
}

/**
 * Wrap a PKCS#1 `RSAPrivateKey` DER blob in a PKCS#8 `PrivateKeyInfo` envelope.
 * Web Crypto's `importKey("pkcs8", ...)` only accepts PKCS#8, but GitHub
 * hands out PKCS#1 PEMs (`-----BEGIN RSA PRIVATE KEY-----`) by default, so
 * we wrap on the fly when we detect that header.
 */
function wrapPkcs1AsPkcs8(pkcs1: Uint8Array): Uint8Array {
  // AlgorithmIdentifier for rsaEncryption (OID 1.2.840.113549.1.1.1) + NULL params.
  const rsaAlgorithmIdentifier = [
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
    0x01, 0x05, 0x00,
  ];
  const version = [0x02, 0x01, 0x00]; // INTEGER 0
  const octetStringHeader = [0x04, ...encodeDerLength(pkcs1.length)];
  const bodyLen =
    version.length +
    rsaAlgorithmIdentifier.length +
    octetStringHeader.length +
    pkcs1.length;
  const outerHeader = [0x30, ...encodeDerLength(bodyLen)];

  const out = new Uint8Array(outerHeader.length + bodyLen);
  let off = 0;
  out.set(outerHeader, off);
  off += outerHeader.length;
  out.set(version, off);
  off += version.length;
  out.set(rsaAlgorithmIdentifier, off);
  off += rsaAlgorithmIdentifier.length;
  out.set(octetStringHeader, off);
  off += octetStringHeader.length;
  out.set(pkcs1, off);
  return out;
}

function pemToPkcs8(pem: string): ArrayBuffer {
  // GitHub Apps hand out PKCS#1 PEMs (`BEGIN RSA PRIVATE KEY`), but Web
  // Crypto only imports PKCS#8 (`BEGIN PRIVATE KEY`). Accept either and
  // auto-wrap PKCS#1 as PKCS#8 so users don't have to run openssl.
  const isPkcs1 = /-----BEGIN RSA PRIVATE KEY-----/.test(pem);
  const cleaned = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  if (!cleaned) throw new Error("Empty GitHub App private key");
  const binary = atob(cleaned);
  const rawDer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) rawDer[i] = binary.charCodeAt(i);

  const pkcs8 = isPkcs1 ? wrapPkcs1AsPkcs8(rawDer) : rawDer;
  // Copy into a fresh ArrayBuffer so the type is narrow (Web Crypto
  // rejects SharedArrayBuffer in some type signatures) and detached from
  // any larger backing store.
  const out = new ArrayBuffer(pkcs8.byteLength);
  new Uint8Array(out).set(pkcs8);
  return out;
}

async function importPrivateKey(pem: string) {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/**
 * Create a JWT signed with the GitHub App's private key.
 *
 * GitHub allows up to 10 minutes; we issue 9 minutes with a 60s backdated `iat`
 * to tolerate clock skew.
 */
export async function createAppJwt(
  appId: string,
  privateKeyPem: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: now - 60, exp: now + 9 * 60, iss: appId };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

// ---------------------------------------------------------------------------
// Installation token exchange
// ---------------------------------------------------------------------------

interface AccessTokenResponse {
  token: string;
  expires_at: string;
}

/**
 * Fetch (or reuse) a short-lived installation access token.
 *
 * Results are cached in-process until `CACHE_SAFETY_MARGIN_SECONDS` before the
 * real expiry so the same token can be reused across a burst of API calls.
 */
export async function getInstallationToken(
  app: GitHubAppEnvConfig,
  installationId: string,
): Promise<string> {
  const key = cacheKey(app.appId, installationId);
  const cached = tokenCache.get(key);
  const nowSec = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt > nowSec) return cached.token;

  const jwt = await createAppJwt(app.appId, app.privateKey);
  const res = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwt}`,
        "User-Agent": "jant-github-sync",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `GitHub App token exchange failed (${res.status}): ${body}`,
    );
  }

  const data = (await res.json()) as AccessTokenResponse;
  const expiresAt =
    Math.floor(new Date(data.expires_at).getTime() / 1000) -
    CACHE_SAFETY_MARGIN_SECONDS;
  tokenCache.set(key, { token: data.token, expiresAt });
  return data.token;
}

/**
 * List repositories accessible to a given installation.
 *
 * Used during the connect flow so users can pick which repo to sync.
 */
export async function listInstallationRepos(
  app: GitHubAppEnvConfig,
  installationId: string,
): Promise<
  Array<{ fullName: string; private: boolean; defaultBranch: string }>
> {
  const token = await getInstallationToken(app, installationId);
  const repos: Array<{
    fullName: string;
    private: boolean;
    defaultBranch: string;
  }> = [];
  let page = 1;
  // GitHub caps at 100 per page; we page until exhausted (installations
  // rarely have >100 repos but do it right).
  while (true) {
    const res = await fetch(
      `${GITHUB_API}/installation/repositories?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "jant-github-sync",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Listing installation repos failed: ${res.status} ${body}`,
      );
    }
    const data = (await res.json()) as {
      repositories: Array<{
        full_name: string;
        private: boolean;
        default_branch: string;
      }>;
    };
    for (const r of data.repositories) {
      repos.push({
        fullName: r.full_name,
        private: r.private,
        defaultBranch: r.default_branch,
      });
    }
    if (data.repositories.length < 100) break;
    page++;
  }
  return repos;
}

/**
 * Build the URL users visit to install the GitHub App on their account/org.
 *
 * `state` is a CSRF token the caller should verify on the redirect back.
 */
export function buildInstallUrl(slug: string, state: string): string {
  const params = new URLSearchParams({ state });
  return `https://github.com/apps/${encodeURIComponent(slug)}/installations/new?${params.toString()}`;
}
