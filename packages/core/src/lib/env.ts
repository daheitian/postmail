type EnvSource = object | undefined | null;

function toEnvRecord(env: EnvSource): Record<string, unknown> {
  return (env ?? {}) as Record<string, unknown>;
}

/**
 * Returns the first non-empty environment variable value from `keys`.
 *
 * Canonical keys should be listed first, followed by any temporary legacy
 * aliases that remain during the runtime migration.
 */
export function getEnvString(
  env: EnvSource,
  ...keys: readonly string[]
): string | undefined {
  const record = toEnvRecord(env);

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

export function getSiteUrl(env: EnvSource): string {
  return getEnvString(env, "JANT_SITE_URL", "SITE_URL") ?? "";
}

export function getAuthSecret(env: EnvSource): string | undefined {
  return getEnvString(env, "JANT_AUTH_SECRET", "AUTH_SECRET");
}

export function getDevApiToken(env: EnvSource): string | undefined {
  return getEnvString(env, "JANT_DEV_API_TOKEN", "DEV_API_TOKEN");
}

export function getStorageDriverEnv(env: EnvSource): string | undefined {
  return getEnvString(env, "JANT_STORAGE_DRIVER", "STORAGE_DRIVER");
}

export function getDataDir(env: EnvSource): string | undefined {
  return getEnvString(env, "JANT_DATA_DIR", "DATA_DIR");
}

function joinDataSubpath(dataDir: string, child: string): string {
  return `${dataDir.replace(/[\\/]+$/, "")}/${child}`;
}

export function getLocalStoragePath(env: EnvSource): string | undefined {
  const explicit = getEnvString(
    env,
    "JANT_LOCAL_STORAGE_PATH",
    "LOCAL_STORAGE_PATH",
  );
  if (explicit) {
    return explicit;
  }

  const dataDir = getDataDir(env);
  return dataDir ? joinDataSubpath(dataDir, "media") : undefined;
}

export function getDefaultStorageDriver(env: EnvSource): "local" | "r2" {
  const record = toEnvRecord(env);
  return record["NODE_SQLITE"] ? "local" : "r2";
}

export function getConfiguredStorageDriver(env: EnvSource): string {
  return getStorageDriverEnv(env) ?? getDefaultStorageDriver(env);
}

export function shouldTrustProxy(env: EnvSource): boolean {
  return getEnvString(env, "JANT_TRUST_PROXY") === "true";
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
