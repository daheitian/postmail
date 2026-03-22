import type { SiteMemberRole } from "../types.js";
import { timingSafeEqualBytes } from "./crypto.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface HostedSsoClaims {
  aud: "jant-core";
  email: string;
  exp: number;
  iat: number;
  iss: "jant-cloud";
  name: string | null;
  role: SiteMemberRole;
  siteId: string;
  sub: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function createHmacSignature(
  secret: string,
  payload: string,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload)),
  );
}

export async function signHostedSsoToken(
  secret: string,
  claims: HostedSsoClaims,
): Promise<string> {
  const payload = toBase64Url(textEncoder.encode(JSON.stringify(claims)));
  const signature = await createHmacSignature(secret, payload);
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifyHostedSsoToken(
  secret: string,
  token: string,
): Promise<HostedSsoClaims> {
  const [payloadPart, signaturePart, ...rest] = token.split(".");
  if (!payloadPart || !signaturePart || rest.length > 0) {
    throw new Error("Malformed hosted SSO token.");
  }

  const expectedSignature = await createHmacSignature(secret, payloadPart);
  const providedSignature = fromBase64Url(signaturePart);
  if (!timingSafeEqualBytes(expectedSignature, providedSignature)) {
    throw new Error("Invalid hosted SSO token signature.");
  }

  const claims = JSON.parse(
    textDecoder.decode(fromBase64Url(payloadPart)),
  ) as Partial<HostedSsoClaims>;

  if (
    claims.iss !== "jant-cloud" ||
    claims.aud !== "jant-core" ||
    typeof claims.sub !== "string" ||
    typeof claims.siteId !== "string" ||
    typeof claims.email !== "string" ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number" ||
    (claims.name !== null && typeof claims.name !== "string") ||
    !["owner", "admin", "editor"].includes(String(claims.role))
  ) {
    throw new Error("Invalid hosted SSO token payload.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now) {
    throw new Error("Hosted SSO token has expired.");
  }

  return claims as HostedSsoClaims;
}
