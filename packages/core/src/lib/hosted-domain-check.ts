import { timingSafeEqualBytes } from "./crypto.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface HostedDomainCheckClaims {
  aud: "jant-cloud";
  domainId: string;
  host: string;
  iat: number;
  iss: "jant-core";
  nonce: string;
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

export async function signHostedDomainCheckToken(
  secret: string,
  claims: HostedDomainCheckClaims,
): Promise<string> {
  const payload = toBase64Url(textEncoder.encode(JSON.stringify(claims)));
  const signature = await createHmacSignature(secret, payload);
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifyHostedDomainCheckToken(
  secret: string,
  token: string,
): Promise<HostedDomainCheckClaims> {
  const [payloadPart, signaturePart, ...rest] = token.split(".");
  if (!payloadPart || !signaturePart || rest.length > 0) {
    throw new Error("Malformed hosted domain check token.");
  }

  const expectedSignature = await createHmacSignature(secret, payloadPart);
  const providedSignature = fromBase64Url(signaturePart);
  if (!timingSafeEqualBytes(expectedSignature, providedSignature)) {
    throw new Error("Invalid hosted domain check token signature.");
  }

  const claims = JSON.parse(
    textDecoder.decode(fromBase64Url(payloadPart)),
  ) as Partial<HostedDomainCheckClaims>;

  if (
    claims.iss !== "jant-core" ||
    claims.aud !== "jant-cloud" ||
    typeof claims.host !== "string" ||
    typeof claims.domainId !== "string" ||
    typeof claims.nonce !== "string" ||
    typeof claims.iat !== "number"
  ) {
    throw new Error("Invalid hosted domain check token payload.");
  }

  return claims as HostedDomainCheckClaims;
}
