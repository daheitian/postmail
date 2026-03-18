import type { Context } from "hono";
import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider, useLingui } from "../context.js";
import { createI18n } from "../i18n.js";

function InterpolationProbe() {
  const { t } = useLingui();

  return t({
    message: "Use {brandColorName}",
    comment: "@context: Test string for Lingui interpolation support",
    values: { brandColorName: "Forest Green" },
  });
}

describe("useLingui", () => {
  it("passes descriptor values through to the Lingui runtime", () => {
    const i18n = createI18n("en");
    const c = {
      get(key: string) {
        if (key === "i18n") {
          return i18n;
        }

        return undefined;
      },
    } as unknown as Context;

    I18nProvider({ c, children: "" });
    const html = renderToString(InterpolationProbe());

    expect(html).toContain("Use Forest Green");
  });
});
