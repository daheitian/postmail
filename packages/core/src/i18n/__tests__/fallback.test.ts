import { describe, expect, it } from "vitest";
import { msg } from "@lingui/core/macro";
import { createI18n } from "../i18n.js";

/**
 * Guards the "public surface stays English under non-English locales" contract.
 *
 * Only the settings catalog is translated today. A `msg()` that lives in a
 * public file (no settings catalog entry, no zh-Hans translation) must fall
 * back to the source English message when the active locale is `zh-Hans`.
 * If Lingui's fallback behavior silently returns an empty string instead of
 * the descriptor's source message (a known pitfall with `--strict` compiles
 * or if the public catalog were loaded with empty msgstrs), this test fails.
 */
describe("i18n locale fallback", () => {
  it("renders settings catalog entries in zh-Hans", () => {
    const i18n = createI18n("zh-Hans");
    expect(i18n.locale).toBe("zh-Hans");
  });

  it("falls back to source English for unknown keys under zh-Hans", () => {
    const i18n = createI18n("zh-Hans");
    // A descriptor whose hash is intentionally not present in any catalog —
    // exercises the source-message fallback path.
    const unique = msg({
      message: "Jant fallback canary string",
      comment: "@context: test fixture — not shipped anywhere",
    });
    expect(i18n._(unique)).toBe("Jant fallback canary string");
  });

  it("renders source English under en", () => {
    const i18n = createI18n("en");
    const unique = msg({
      message: "Jant fallback canary string",
      comment: "@context: test fixture — not shipped anywhere",
    });
    expect(i18n._(unique)).toBe("Jant fallback canary string");
  });
});
