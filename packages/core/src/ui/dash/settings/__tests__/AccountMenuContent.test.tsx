import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@lingui/react/macro", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lingui/react/macro")>();
  return {
    ...actual,
    useLingui: () => ({
      t: ({
        message,
        values,
      }: {
        message: string;
        comment?: string;
        values?: Record<string, unknown>;
      }) =>
        message.replace(/\{(\w+)\}/g, (_, key: string) =>
          String(values?.[key] ?? ""),
        ),
    }),
  };
});

async function loadAccountMenuContent() {
  const { AccountMenuContent } = await import("../AccountMenuContent.js");
  return AccountMenuContent;
}

describe("AccountMenuContent", () => {
  it("falls back to the hosted account host when the provider label is blank", async () => {
    const AccountMenuContent = await loadAccountMenuContent();
    const html = renderToString(
      AccountMenuContent({
        hostedControlPlaneAccountUrl: "https://cloud.example/settings/account",
        hostedControlPlaneProviderLabel: "   ",
      }),
    );

    expect(html).toContain(
      "This hosted site signs in through cloud.example. Manage password and hosted access there.",
    );
    expect(html).toContain(
      "Manage password and hosted access in cloud.example",
    );
  });

  it("falls back to the hosted account host when the provider label is visually blank", async () => {
    const AccountMenuContent = await loadAccountMenuContent();
    const html = renderToString(
      AccountMenuContent({
        hostedControlPlaneAccountUrl: "https://cloud.example/settings/account",
        hostedControlPlaneProviderLabel: "\u200B\u2060",
      }),
    );

    expect(html).toContain(
      "This hosted site signs in through cloud.example. Manage password and hosted access there.",
    );
    expect(html).toContain(
      "Manage password and hosted access in cloud.example",
    );
  });
});
