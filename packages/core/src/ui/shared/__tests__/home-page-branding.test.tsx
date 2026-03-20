import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it } from "vitest";
import { HomePageBranding } from "../HomePageBranding.js";

describe("HomePageBranding", () => {
  it("renders the footer branding link as text only", () => {
    const html = renderToString(HomePageBranding({}));

    expect(html).toContain("Build with");
    expect(html).toContain("https://github.com/jant-me/jant");
    expect(html).toContain(">Jant</span>");
    expect(html).not.toContain("<svg");
  });
});
