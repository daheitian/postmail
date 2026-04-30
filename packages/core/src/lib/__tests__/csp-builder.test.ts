import { describe, expect, it } from "vitest";
import { buildCspDirectives } from "../csp-builder.js";

function defaults() {
  return {
    path: "/",
    isFrameProtected: false,
    assetOrigin: null,
    uploadConnectSources: [],
    isDev: false,
  };
}

describe("buildCspDirectives", () => {
  it("opens https for frames and scripts on public pages", () => {
    const directives = buildCspDirectives(defaults());
    expect(directives.frameSrc).toEqual(["'self'", "https:"]);
    expect(directives.scriptSrc).toContain("https:");
    expect(directives.connectSrc).toContain("https:");
    expect(directives.frameAncestors).toBeUndefined();
  });

  it("locks down iframes and scripts on admin paths", () => {
    const directives = buildCspDirectives({
      ...defaults(),
      path: "/settings",
      isFrameProtected: true,
    });
    expect(directives.frameSrc).toBeUndefined();
    expect(directives.scriptSrc).not.toContain("https:");
    expect(directives.connectSrc).not.toContain("https:");
    expect(directives.frameAncestors).toEqual(["'none'"]);
  });

  it("includes asset origin in script/style/font src when present", () => {
    const directives = buildCspDirectives({
      ...defaults(),
      assetOrigin: "https://cdn.example.com",
    });
    expect(directives.scriptSrc).toContain("https://cdn.example.com");
    expect(directives.styleSrc).toContain("https://cdn.example.com");
    expect(directives.fontSrc).toContain("https://cdn.example.com");
  });

  it("merges upload connect sources without duplicates", () => {
    const directives = buildCspDirectives({
      ...defaults(),
      isFrameProtected: true,
      uploadConnectSources: [
        "https://s3.us-west-2.amazonaws.com",
        "https://s3.us-west-2.amazonaws.com",
      ],
    });
    const occurrences = directives.connectSrc.filter(
      (s) => s === "https://s3.us-west-2.amazonaws.com",
    );
    expect(occurrences).toHaveLength(1);
  });

  it("adds ws: to connect-src in dev mode", () => {
    const directives = buildCspDirectives({
      ...defaults(),
      isFrameProtected: true,
      isDev: true,
    });
    expect(directives.connectSrc).toContain("ws:");
  });

  it("omits 'unsafe-inline' from script-src by default", () => {
    const directives = buildCspDirectives(defaults());
    expect(directives.scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("adds 'unsafe-inline' to script-src when allowInlineScript is set", () => {
    const directives = buildCspDirectives({
      ...defaults(),
      allowInlineScript: true,
    });
    expect(directives.scriptSrc).toContain("'unsafe-inline'");
  });
});
