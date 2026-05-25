export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getJsonString(value: unknown, key: string): string | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

export function getJsonBoolean(
  value: unknown,
  key: string,
): boolean | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }
  const field = value[key];
  return typeof field === "boolean" ? field : undefined;
}

export function getJsonNumber(value: unknown, key: string): number | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }
  const field = value[key];
  return typeof field === "number" ? field : undefined;
}

export async function readJsonObject(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    const data = JSON.parse(text);
    return isJsonObject(data) ? data : {};
  } catch {
    throw new Error(
      `Expected JSON (HTTP ${response.status}) but got: ${truncate(text.trim(), 200)}`,
    );
  }
}

/**
 * Read a server error message from a failed Response.
 * Prefers JSON `{ error }`, falls back to the raw text body so server-side
 * failures (e.g. plain-text 404 from an edge/proxy) reach the user instead of
 * being masked by a cryptic JSON parse error.
 */
export async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    return fallback;
  }
  return extractErrorMessage(text, fallback);
}

/** Same as readErrorMessage but for a body already read as text (e.g. XHR). */
export function readErrorMessageFromText(
  text: string,
  fallback: string,
): string {
  return extractErrorMessage(text, fallback);
}

function extractErrorMessage(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  try {
    const data = JSON.parse(trimmed);
    if (isJsonObject(data)) {
      const msg = getJsonString(data, "error");
      if (msg) return msg;
    }
  } catch {
    // Not JSON — fall through and surface the raw text below.
  }
  return truncate(trimmed, 200);
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
