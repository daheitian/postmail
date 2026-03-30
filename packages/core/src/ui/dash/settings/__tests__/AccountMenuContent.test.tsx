import type { Context } from "hono";
import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../../../i18n/context.js";
import { createI18n } from "../../../../i18n/i18n.js";
import { AccountMenuContent } from "../AccountMenuContent.js";

function renderAccountMenuContent(
  props: Parameters<typeof AccountMenuContent>[0],
): string {
  const i18n = createI18n("en");
  const c = {
    get(key: string) {
      if (key === "i18n") return i18n;
      return undefined;
    },
  } as unknown as Context;

  I18nProvider({ c, children: "" });
  return renderToString(AccountMenuContent(props));
}

describe("AccountMenuContent", () => {
  it("interpolates the configured provider label in hosted copy", () => {
    const html = renderAccountMenuContent({
      hostedControlPlaneAccountUrl: "https://cloud.example/settings/account",
      hostedControlPlaneProviderLabel: "jant.me",
    });

    expect(html).toContain(
      "This hosted site signs in through jant.me. Manage password and hosted access there.",
    );
    expect(html).toContain(
      "Password and hosted access are managed through jant.me.",
    );
    expect(html).toContain("Manage Account");
    expect(html).toContain("Manage password and hosted access in jant.me");
  });

  it("falls back to the hosted account host when the provider label is blank", () => {
    const html = renderAccountMenuContent({
      hostedControlPlaneAccountUrl: "https://cloud.example/settings/account",
      hostedControlPlaneProviderLabel: "   ",
    });

    expect(html).toContain(
      "This hosted site signs in through cloud.example. Manage password and hosted access there.",
    );
    expect(html).toContain(
      "Manage password and hosted access in cloud.example",
    );
  });

  it("falls back to the hosted account host when the provider label is visually blank", () => {
    const html = renderAccountMenuContent({
      hostedControlPlaneAccountUrl: "https://cloud.example/settings/account",
      hostedControlPlaneProviderLabel: "\u200B\u2060",
    });

    expect(html).toContain(
      "This hosted site signs in through cloud.example. Manage password and hosted access there.",
    );
    expect(html).toContain(
      "Manage password and hosted access in cloud.example",
    );
  });
});
