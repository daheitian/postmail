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
  const data = await response.json();
  return isJsonObject(data) ? data : {};
}
