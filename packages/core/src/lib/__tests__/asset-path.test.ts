import { describe, expect, it } from "vitest";
import {
  ASSET_BASE_PATH,
  getPublicAssetBasePath,
  isAssetPath,
  toAssetPath,
  toPublicAssetPath,
} from "../asset-path.js";

describe("getPublicAssetBasePath", () => {
  it("uses the root asset path when the site has no prefix", () => {
    expect(getPublicAssetBasePath("")).toBe("/_assets");
  });

  it("includes the site prefix in the public asset path", () => {
    expect(getPublicAssetBasePath("/blog")).toBe("/blog/_assets");
  });
});

describe("toAssetPath", () => {
  it("joins relative asset paths against the internal base path", () => {
    expect(toAssetPath("client.js")).toBe("/_assets/client.js");
  });

  it("joins relative asset paths against a prefixed public base path", () => {
    expect(toAssetPath("chunks/app.js", "/blog/_assets")).toBe(
      "/blog/_assets/chunks/app.js",
    );
  });
});

describe("isAssetPath", () => {
  it("matches the internal asset namespace", () => {
    expect(isAssetPath("/_assets/client.css")).toBe(true);
  });

  it("matches prefixed public asset namespaces", () => {
    expect(isAssetPath("/blog/_assets/client.css", "/blog/_assets")).toBe(true);
  });
});

describe("toPublicAssetPath", () => {
  it("rewrites internal asset paths to the public asset base path", () => {
    expect(
      toPublicAssetPath(`${ASSET_BASE_PATH}/client.js`, "/blog/_assets"),
    ).toBe("/blog/_assets/client.js");
  });

  it("leaves already-public asset paths unchanged", () => {
    expect(toPublicAssetPath("/blog/_assets/client.js", "/blog/_assets")).toBe(
      "/blog/_assets/client.js",
    );
  });
});
