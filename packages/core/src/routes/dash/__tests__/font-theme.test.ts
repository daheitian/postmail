/**
 * Font theme save & read flow test.
 *
 * Verifies that FONT_THEME setting persists and buildThemeStyle generates
 * the correct CSS override for --font-body.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../../__tests__/helpers/db.js";
import { createSettingsService } from "../../../services/settings.js";
import { BUILTIN_FONT_THEMES } from "../../../ui/font-themes.js";
import { buildThemeStyle } from "../../../lib/theme.js";
import type { Database } from "../../../db/index.js";

describe("Font theme save & CSS generation", () => {
  let db: Database;
  let settings: ReturnType<typeof createSettingsService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    settings = createSettingsService(db);
  });

  it("saves and reads FONT_THEME setting", async () => {
    // Initially null
    const initial = await settings.get("FONT_THEME");
    expect(initial).toBeNull();

    // Save serif
    await settings.set("FONT_THEME", "serif");
    expect(await settings.get("FONT_THEME")).toBe("serif");

    // Update to humanist
    await settings.set("FONT_THEME", "humanist");
    expect(await settings.get("FONT_THEME")).toBe("humanist");

    // Remove (reset to default)
    await settings.remove("FONT_THEME");
    expect(await settings.get("FONT_THEME")).toBeNull();
  });

  it("generates correct CSS when switching from serif to humanist", async () => {
    // Save serif, then switch to humanist — simulates the middleware flow
    await settings.set("FONT_THEME", "serif");
    await settings.set("FONT_THEME", "humanist");

    const fontThemeId = await settings.get("FONT_THEME");
    expect(fontThemeId).toBe("humanist");

    const fontTheme = BUILTIN_FONT_THEMES.find((f) => f.id === fontThemeId)!;
    expect(fontTheme).toBeDefined();
    expect(fontTheme.fontFamily).toContain("Optima");

    const fontOverrides = { "--font-body": fontTheme.fontFamily };
    const css = buildThemeStyle(undefined, fontOverrides);

    expect(css).toContain("--font-body:");
    expect(css).toContain("Optima");
    expect(css).not.toContain("Charter");
  });

  it("generates no font override when default theme is selected", async () => {
    // Default theme -> no FONT_THEME setting -> no font override
    const fontThemeId = await settings.get("FONT_THEME");
    expect(fontThemeId).toBeNull();

    const fontTheme = fontThemeId
      ? BUILTIN_FONT_THEMES.find((f) => f.id === fontThemeId)
      : undefined;
    expect(fontTheme).toBeUndefined();

    const fontOverrides: Record<string, string> = {};
    if (fontTheme) {
      fontOverrides["--font-body"] = fontTheme.fontFamily;
    }

    const css = buildThemeStyle(undefined, fontOverrides);
    expect(css).toBe("");
  });
});
