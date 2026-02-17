import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createSettingsService } from "../../services/settings.js";
import type { Database } from "../../db/index.js";
import { getConfig, getHomeDefaultView, getConfigFallback } from "../config.js";
import type { Context } from "hono";

function createMockContext(
  services: { settings: ReturnType<typeof createSettingsService> },
  env: Record<string, string> = {},
): Context {
  return {
    env,
    var: { services },
  } as unknown as Context;
}

describe("getConfig", () => {
  let db: Database;
  let settingsService: ReturnType<typeof createSettingsService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    settingsService = createSettingsService(db);
  });

  it("returns default value when no DB or ENV value exists", async () => {
    const c = createMockContext({ settings: settingsService });
    const result = await getConfig(c, "HOME_DEFAULT_VIEW");
    expect(result).toBe("latest");
  });

  it("returns DB value when set", async () => {
    await settingsService.set("HOME_DEFAULT_VIEW", "featured");
    const c = createMockContext({ settings: settingsService });
    const result = await getConfig(c, "HOME_DEFAULT_VIEW");
    expect(result).toBe("featured");
  });

  it("returns env value when DB is empty", async () => {
    const c = createMockContext(
      { settings: settingsService },
      {
        HOME_DEFAULT_VIEW: "featured",
      },
    );
    const result = await getConfig(c, "HOME_DEFAULT_VIEW");
    expect(result).toBe("featured");
  });

  it("DB value takes precedence over env value", async () => {
    await settingsService.set("HOME_DEFAULT_VIEW", "featured");
    const c = createMockContext(
      { settings: settingsService },
      {
        HOME_DEFAULT_VIEW: "latest",
      },
    );
    const result = await getConfig(c, "HOME_DEFAULT_VIEW");
    expect(result).toBe("featured");
  });
});

describe("getHomeDefaultView", () => {
  let db: Database;
  let settingsService: ReturnType<typeof createSettingsService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    settingsService = createSettingsService(db);
  });

  it("returns 'latest' by default", async () => {
    const c = createMockContext({ settings: settingsService });
    const result = await getHomeDefaultView(c);
    expect(result).toBe("latest");
  });

  it("returns 'featured' when set in DB", async () => {
    await settingsService.set("HOME_DEFAULT_VIEW", "featured");
    const c = createMockContext({ settings: settingsService });
    const result = await getHomeDefaultView(c);
    expect(result).toBe("featured");
  });
});

describe("getConfigFallback", () => {
  it("returns default when no env value", () => {
    const c = createMockContext({
      settings: {} as ReturnType<typeof createSettingsService>,
    });
    const result = getConfigFallback(c, "HOME_DEFAULT_VIEW");
    expect(result).toBe("latest");
  });

  it("returns env value when set", () => {
    const c = createMockContext(
      { settings: {} as ReturnType<typeof createSettingsService> },
      { HOME_DEFAULT_VIEW: "featured" },
    );
    const result = getConfigFallback(c, "HOME_DEFAULT_VIEW");
    expect(result).toBe("featured");
  });
});
