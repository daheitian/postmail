import { describe, expect, it } from "vitest";
import type { SettingsService } from "../../services/settings.js";
import {
  listStoredInstallations,
  MAX_STORED_INSTALLATIONS,
  removeStoredInstallation,
  upsertStoredInstallation,
  type StoredInstallation,
} from "../github-sync-installations.js";

/**
 * Minimal in-memory settings stub — only implements the two methods
 * the installations module uses so tests don't need a full DB.
 */
function memorySettings(initial: Record<string, string> = {}): SettingsService {
  const store = new Map(Object.entries(initial));
  return {
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    // The module doesn't use the other methods, so they can throw on
    // access — lets tests fail loudly if the surface expands by surprise.
  } as unknown as SettingsService;
}

function makeInstallation(
  overrides: Partial<StoredInstallation> = {},
): StoredInstallation {
  return {
    installationId: "123",
    account: {
      login: "acme",
      type: "Organization",
      avatarUrl: "https://example.com/avatar.png",
    },
    addedAt: 1_700_000_000,
    ...overrides,
  };
}

describe("github-sync installations storage", () => {
  it("returns [] when the setting is unset", async () => {
    const s = memorySettings();
    expect(await listStoredInstallations(s)).toEqual([]);
  });

  it("returns [] when the stored JSON is malformed", async () => {
    const s = memorySettings({ GITHUB_SYNC_APP_INSTALLATIONS: "not json" });
    expect(await listStoredInstallations(s)).toEqual([]);
  });

  it("filters out entries that fail shape validation", async () => {
    const s = memorySettings({
      GITHUB_SYNC_APP_INSTALLATIONS: JSON.stringify([
        makeInstallation(),
        { installationId: "456" }, // missing account
        { installationId: "789", account: { login: "bad" }, addedAt: 1 }, // incomplete account
      ]),
    });
    const result = await listStoredInstallations(s);
    expect(result).toHaveLength(1);
    expect(result[0]?.installationId).toBe("123");
  });

  it("appends a new installation on upsert", async () => {
    const s = memorySettings();
    await upsertStoredInstallation(s, makeInstallation());
    const list = await listStoredInstallations(s);
    expect(list).toHaveLength(1);
    expect(list[0]?.installationId).toBe("123");
  });

  it("preserves addedAt when upserting an existing installation", async () => {
    const s = memorySettings();
    await upsertStoredInstallation(
      s,
      makeInstallation({ addedAt: 1_000_000_000 }),
    );
    // Same id, different account snapshot + newer timestamp
    await upsertStoredInstallation(
      s,
      makeInstallation({
        addedAt: 2_000_000_000,
        account: {
          login: "acme-renamed",
          type: "Organization",
          avatarUrl: "https://example.com/new.png",
        },
      }),
    );
    const list = await listStoredInstallations(s);
    expect(list).toHaveLength(1);
    expect(list[0]?.addedAt).toBe(1_000_000_000); // preserved
    expect(list[0]?.account.login).toBe("acme-renamed"); // updated
  });

  it("caps the list at MAX_STORED_INSTALLATIONS, dropping oldest", async () => {
    const s = memorySettings();
    // Seed with the cap's worth of entries
    for (let i = 0; i < MAX_STORED_INSTALLATIONS; i++) {
      await upsertStoredInstallation(
        s,
        makeInstallation({
          installationId: String(i + 1),
          addedAt: i, // id=1 is oldest
        }),
      );
    }
    // One more — id=1 should get evicted
    await upsertStoredInstallation(
      s,
      makeInstallation({
        installationId: "overflow",
        addedAt: MAX_STORED_INSTALLATIONS + 100,
      }),
    );
    const list = await listStoredInstallations(s);
    expect(list).toHaveLength(MAX_STORED_INSTALLATIONS);
    expect(list.find((i) => i.installationId === "1")).toBeUndefined();
    expect(list.find((i) => i.installationId === "overflow")).toBeDefined();
  });

  it("removes a stored installation by id", async () => {
    const s = memorySettings();
    await upsertStoredInstallation(
      s,
      makeInstallation({ installationId: "1" }),
    );
    await upsertStoredInstallation(
      s,
      makeInstallation({ installationId: "2" }),
    );
    await removeStoredInstallation(s, "1");
    const list = await listStoredInstallations(s);
    expect(list.map((i) => i.installationId)).toEqual(["2"]);
  });

  it("remove is a no-op for unknown ids", async () => {
    const s = memorySettings();
    await upsertStoredInstallation(
      s,
      makeInstallation({ installationId: "1" }),
    );
    const before = await listStoredInstallations(s);
    await removeStoredInstallation(s, "does-not-exist");
    const after = await listStoredInstallations(s);
    expect(after).toEqual(before);
  });
});
