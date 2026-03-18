import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it } from "vitest";
import { HomePageBranding } from "../HomePageBranding.js";

describe("HomePageBranding", () => {
  it("renders the Jant mark inside the footer branding link", () => {
    const html = renderToString(HomePageBranding({}));

    expect(html).toContain("Build with");
    expect(html).toContain("https://github.com/jant-me/jant");
    expect(html).toContain("home-branding-mark");
    expect(html).toContain("<svg");
    expect(html).toContain(">Jant</span>");
  });
});
