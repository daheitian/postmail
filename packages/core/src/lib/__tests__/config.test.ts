import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createSettingsService } from "../../services/settings.js";
import type { Database } from "../../db/index.js";
import {
  getConfig,
  getHomeDefaultView,
  getConfigFallback,
  getTimeZone,
  getSiteFooter,
  isNoIndex,
} from "../config.js";
import type { Context } from "hono";

function createMockContext(
  allSettings: Record<string, string>,
  env: Record<string, string> = {},
): Context {
  return {
    env,
    var: { allSettings },
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

  it("returns default value when no DB or ENV value exists", () => {
    const c = createMockContext({});
    const result = getConfig(c, "HOME_DEFAULT_VIEW");
    expect(result).toBe("latest");
  });

  it("returns DB value when set", async () => {
    await settingsService.set("HOME_DEFAULT_VIEW", "featured");
    const allSettings = await settingsService.getAll();
    const c = createMockContext(allSettings);
    const result = getConfig(c, "HOME_DEFAULT_VIEW");
    expect(result).toBe("featured");
  });

  it("returns env value when DB is empty", () => {
    const c = createMockContext(
      {},
      {
        HOME_DEFAULT_VIEW: "featured",
      },
    );
    const result = getConfig(c, "HOME_DEFAULT_VIEW");
    expect(result).toBe("featured");
  });

  it("DB value takes precedence over env value", async () => {
    await settingsService.set("HOME_DEFAULT_VIEW", "featured");
    const allSettings = await settingsService.getAll();
    const c = createMockContext(allSettings, {
      HOME_DEFAULT_VIEW: "latest",
    });
    const result = getConfig(c, "HOME_DEFAULT_VIEW");
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

  it("returns 'latest' by default", () => {
    const c = createMockContext({});
    const result = getHomeDefaultView(c);
    expect(result).toBe("latest");
  });

  it("returns 'featured' when set in DB", async () => {
    await settingsService.set("HOME_DEFAULT_VIEW", "featured");
    const allSettings = await settingsService.getAll();
    const c = createMockContext(allSettings);
    const result = getHomeDefaultView(c);
    expect(result).toBe("featured");
  });
});

describe("getTimeZone", () => {
  let db: Database;
  let settingsService: ReturnType<typeof createSettingsService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    settingsService = createSettingsService(db);
  });

  it("returns 'UTC' by default", () => {
    const c = createMockContext({});
    const result = getTimeZone(c);
    expect(result).toBe("UTC");
  });

  it("returns DB value when set", async () => {
    await settingsService.set("TIME_ZONE", "Beijing");
    const allSettings = await settingsService.getAll();
    const c = createMockContext(allSettings);
    const result = getTimeZone(c);
    expect(result).toBe("Beijing");
  });
});

describe("getSiteFooter", () => {
  let db: Database;
  let settingsService: ReturnType<typeof createSettingsService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    settingsService = createSettingsService(db);
  });

  it("returns empty string by default", () => {
    const c = createMockContext({});
    const result = getSiteFooter(c);
    expect(result).toBe("");
  });

  it("returns DB value when set", async () => {
    await settingsService.set("SITE_FOOTER", "**Footer text**");
    const allSettings = await settingsService.getAll();
    const c = createMockContext(allSettings);
    const result = getSiteFooter(c);
    expect(result).toBe("**Footer text**");
  });
});

describe("isNoIndex", () => {
  let db: Database;
  let settingsService: ReturnType<typeof createSettingsService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    settingsService = createSettingsService(db);
  });

  it("returns false by default", () => {
    const c = createMockContext({});
    const result = isNoIndex(c);
    expect(result).toBe(false);
  });

  it("returns true when NOINDEX is set to 'true'", async () => {
    await settingsService.set("NOINDEX", "true");
    const allSettings = await settingsService.getAll();
    const c = createMockContext(allSettings);
    const result = isNoIndex(c);
    expect(result).toBe(true);
  });

  it("returns false when NOINDEX is set to other value", async () => {
    await settingsService.set("NOINDEX", "false");
    const allSettings = await settingsService.getAll();
    const c = createMockContext(allSettings);
    const result = isNoIndex(c);
    expect(result).toBe(false);
  });
});

describe("DEFAULT_THEME", () => {
  it("returns 'halloween' by default", () => {
    const c = createMockContext({});
    const result = getConfigFallback(c, "DEFAULT_THEME");
    expect(result).toBe("halloween");
  });

  it("returns env value when DEFAULT_THEME is set", () => {
    const c = createMockContext({}, { DEFAULT_THEME: "panda" });
    const result = getConfigFallback(c, "DEFAULT_THEME");
    expect(result).toBe("panda");
  });

  it("is envOnly so getConfig skips DB lookup", () => {
    const c = createMockContext({}, { DEFAULT_THEME: "beach" });
    const result = getConfig(c, "DEFAULT_THEME");
    expect(result).toBe("beach");
  });
});

describe("getConfigFallback", () => {
  it("returns default when no env value", () => {
    const c = createMockContext({});
    const result = getConfigFallback(c, "HOME_DEFAULT_VIEW");
    expect(result).toBe("latest");
  });

  it("returns env value when set", () => {
    const c = createMockContext({}, { HOME_DEFAULT_VIEW: "featured" });
    const result = getConfigFallback(c, "HOME_DEFAULT_VIEW");
    expect(result).toBe("featured");
  });
});
