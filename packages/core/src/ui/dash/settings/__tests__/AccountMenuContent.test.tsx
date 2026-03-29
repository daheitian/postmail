import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@lingui/react/macro", () => ({
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
}));

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
});
