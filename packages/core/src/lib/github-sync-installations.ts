/**
 * Stored GitHub App installations for a site.
 *
 * Each entry represents one authorized install on a GitHub account or org.
 * The list grows as the owner grants the App access to more accounts —
 * the picker UI uses it as the source of truth for the "Owner" dropdown.
 *
 * Read/write through the settings service under
 * `GITHUB_SYNC_APP_INSTALLATIONS`. JSON-encoded array.
 */

import type { SettingsService } from "../services/settings.js";

/** Maximum number of installations we retain. Oldest entries are dropped. */
export const MAX_STORED_INSTALLATIONS = 50;

export type GitHubAccountType = "User" | "Organization";

export interface StoredInstallationAccount {
  login: string;
  type: GitHubAccountType;
  avatarUrl: string;
}

export interface StoredInstallation {
  installationId: string;
  account: StoredInstallationAccount;
  /** Unix seconds — first time this installation was seen on this site. */
  addedAt: number;
}

/**
 * Read the stored installations list.
 *
 * Returns an empty array when the key is unset or malformed. Silently
 * discards entries that fail shape validation — a corrupted entry should
 * never take down the picker.
 */
export async function listStoredInstallations(
  settings: SettingsService,
): Promise<StoredInstallation[]> {
  const raw = await settings.get("GITHUB_SYNC_APP_INSTALLATIONS");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidInstallation);
  } catch {
    return [];
  }
}

/**
 * Upsert an installation by `installationId`.
 *
 * If the id already exists, updates the account snapshot (login/avatar
 * may drift when orgs are renamed) while preserving the original `addedAt`.
 * Otherwise appends a new entry. Caps total at MAX_STORED_INSTALLATIONS
 * by dropping the oldest `addedAt` — the cap is a safety net; real users
 * won't come close.
 */
export async function upsertStoredInstallation(
  settings: SettingsService,
  installation: StoredInstallation,
): Promise<StoredInstallation[]> {
  const current = await listStoredInstallations(settings);
  const existingIndex = current.findIndex(
    (i) => i.installationId === installation.installationId,
  );

  let next: StoredInstallation[];
  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    next = [...current];
    next[existingIndex] = {
      installationId: installation.installationId,
      account: installation.account,
      // existing is non-null because existingIndex came from findIndex above.
      addedAt: existing ? existing.addedAt : installation.addedAt,
    };
  } else {
    next = [...current, installation];
  }

  if (next.length > MAX_STORED_INSTALLATIONS) {
    next = [...next]
      .sort((a, b) => a.addedAt - b.addedAt)
      .slice(next.length - MAX_STORED_INSTALLATIONS);
  }

  await settings.set("GITHUB_SYNC_APP_INSTALLATIONS", JSON.stringify(next));
  return next;
}

/**
 * Remove an installation by id. Used for lazy cleanup when a request
 * with that installation's token fails with 401/404, indicating it was
 * uninstalled on GitHub. No-op when the id isn't present.
 */
export async function removeStoredInstallation(
  settings: SettingsService,
  installationId: string,
): Promise<StoredInstallation[]> {
  const current = await listStoredInstallations(settings);
  const next = current.filter((i) => i.installationId !== installationId);
  if (next.length === current.length) return current;
  await settings.set("GITHUB_SYNC_APP_INSTALLATIONS", JSON.stringify(next));
  return next;
}

function isValidInstallation(value: unknown): value is StoredInstallation {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.installationId !== "string" || !v.installationId) return false;
  if (typeof v.addedAt !== "number") return false;
  if (typeof v.account !== "object" || v.account === null) return false;
  const account = v.account as Record<string, unknown>;
  if (typeof account.login !== "string" || !account.login) return false;
  if (account.type !== "User" && account.type !== "Organization") return false;
  if (typeof account.avatarUrl !== "string") return false;
  return true;
}
