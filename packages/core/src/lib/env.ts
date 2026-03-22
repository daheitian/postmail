type EnvSource = object | undefined | null;

export const DEFAULT_APP_PORT = 3000;

function toEnvRecord(env: EnvSource): Record<string, unknown> {
  return (env ?? {}) as Record<string, unknown>;
}

function normalizeEnvScalar(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.length > 0 ? value : undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : undefined;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return undefined;
}

/**
 * Returns the first non-empty environment variable value from `keys`.
 *
 * Callers may provide multiple keys when a single semantic value can be
 * sourced from more than one binding at runtime.
 */
export function getEnvString(
  env: EnvSource,
  ...keys: readonly string[]
): string | undefined {
  const record = toEnvRecord(env);

  for (const key of keys) {
    const value = normalizeEnvScalar(record[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

/**
 * Parse a TCP port from an environment value.
 *
 * @param rawPort - Raw environment value to parse
 * @param fallback - Port to use when `rawPort` is empty
 * @returns The parsed port number
 * @example
 * parsePortValue("3000");
 */
export function parsePortValue(
  rawPort: string | undefined,
  fallback = DEFAULT_APP_PORT,
): number {
  if (!rawPort) {
    return fallback;
  }

  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

/**
 * Resolve the configured application port from environment bindings.
 *
 * @param env - Runtime environment bindings
 * @param fallback - Port to use when `PORT` is not set
 * @returns The resolved application port
 * @example
 * getPort({ PORT: "3000" });
 */
export function getPort(env: EnvSource, fallback = DEFAULT_APP_PORT): number {
  return parsePortValue(getEnvString(env, "PORT"), fallback);
}

export function getSiteUrl(env: EnvSource): string {
  return getEnvString(env, "SITE_URL") ?? "";
}

export function getSiteResolutionMode(
  env: EnvSource,
): "single-site" | "host-based" {
  return getEnvString(env, "SITE_RESOLUTION_MODE") === "host-based"
    ? "host-based"
    : "single-site";
}

export function getAuthSecret(env: EnvSource): string | undefined {
  return getEnvString(env, "AUTH_SECRET");
}

export function getDevApiToken(env: EnvSource): string | undefined {
  return getEnvString(env, "DEV_API_TOKEN");
}

export function getInternalAdminToken(env: EnvSource): string | undefined {
  return getEnvString(env, "INTERNAL_ADMIN_TOKEN");
}

export function getHostedControlPlaneBaseUrl(
  env: EnvSource,
): string | undefined {
  return getEnvString(env, "HOSTED_CONTROL_PLANE_BASE_URL");
}

export function getHostedControlPlaneInternalBaseUrl(
  env: EnvSource,
): string | undefined {
  return (
    getEnvString(env, "HOSTED_CONTROL_PLANE_INTERNAL_BASE_URL") ??
    getHostedControlPlaneBaseUrl(env)
  );
}

export function getHostedControlPlaneProviderName(
  env: EnvSource,
): string | undefined {
  return getEnvString(env, "HOSTED_CONTROL_PLANE_PROVIDER_NAME");
}

export function getHostedControlPlaneProviderLabel(
  env: EnvSource,
): string | undefined {
  const configuredName = getHostedControlPlaneProviderName(env)?.trim();
  if (configuredName) {
    return configuredName;
  }

  const hostedControlPlaneBaseUrl = getHostedControlPlaneBaseUrl(env);
  if (!hostedControlPlaneBaseUrl) {
    return undefined;
  }

  return new URL(hostedControlPlaneBaseUrl).hostname;
}

export function getHostedControlPlaneSsoSecret(
  env: EnvSource,
): string | undefined {
  return getEnvString(env, "HOSTED_CONTROL_PLANE_SSO_SECRET");
}

export function getHostedControlPlaneInternalToken(
  env: EnvSource,
): string | undefined {
  return getEnvString(env, "HOSTED_CONTROL_PLANE_INTERNAL_TOKEN");
}

export function getStorageDriverEnv(env: EnvSource): string | undefined {
  return getEnvString(env, "STORAGE_DRIVER");
}

export function getDataDir(env: EnvSource): string | undefined {
  return getEnvString(env, "DATA_DIR");
}

function joinDataSubpath(dataDir: string, child: string): string {
  return `${dataDir.replace(/[\\/]+$/, "")}/${child}`;
}

export function getLocalStoragePath(env: EnvSource): string | undefined {
  const explicit = getEnvString(env, "LOCAL_STORAGE_PATH");
  if (explicit) {
    return explicit;
  }

  const dataDir = getDataDir(env);
  return dataDir ? joinDataSubpath(dataDir, "media") : undefined;
}

export function getDefaultStorageDriver(env: EnvSource): "local" | "r2" {
  const record = toEnvRecord(env);
  return record["NODE_SQLITE"] || record["NODE_DATABASE"] ? "local" : "r2";
}

export function getConfiguredStorageDriver(env: EnvSource): string {
  return getStorageDriverEnv(env) ?? getDefaultStorageDriver(env);
}

export function shouldTrustProxy(env: EnvSource): boolean {
  return getEnvString(env, "TRUST_PROXY") === "true";
}

export function shouldUseSecureCookies(
  env: EnvSource,
  publicRequestUrl: string,
): boolean {
  const siteUrl = getSiteUrl(env);
  if (siteUrl) {
    return new URL(siteUrl).protocol === "https:";
  }

  return new URL(publicRequestUrl).protocol === "https:";
}
