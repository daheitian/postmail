import { describe, expect, it } from "vitest";
import {
  buildJantAppIconSvgMarkup,
  buildJantCircleTileSvgMarkup,
  buildJantSquareTileSvgMarkup,
  getDefaultJantAppleTouchIconBytes,
  getDefaultJantBrandPackBytes,
  getDefaultJantBrandTilePngBytes,
  getDefaultJantCircleTilePngBytes,
  getDefaultJantFaviconIcoBytes,
  getDefaultJantPositiveLogoPngBytes,
  getDefaultJantSquareTilePngBytes,
  getDefaultJantSocialImageBytes,
  getJantBundledAsset,
  getJantBrandPackHref,
  getJantIconFilename,
  getJantIconHref,
  getJantPositiveLogoPngHref,
  JANT_BRAND_PACK_FILENAME,
  JANT_POSITIVE_LOGO_PNG_FILENAME,
  buildJantLogoSvgMarkup,
  getJantLogoFilename,
  getJantLogoHref,
  getJantLogoVariantForFilename,
} from "../jant-branding.js";

describe("jant-branding", () => {
  it("builds stable public asset hrefs for logo downloads", () => {
    expect(getJantLogoHref("positive")).toBe(
      "/_/brand/assets/jant-logo-positive.svg",
    );
    expect(getJantLogoHref("negative", "/demo")).toBe(
      "/demo/_/brand/assets/jant-logo-negative.svg",
    );
    expect(getJantIconHref("brandTileSvg")).toBe(
      "/_/brand/assets/jant-brand-tile.svg",
    );
    expect(getJantIconHref("brandTilePng", "/demo")).toBe(
      "/demo/_/brand/assets/jant-brand-tile-512.png",
    );
    expect(getJantIconHref("squareTileSvg")).toBe(
      "/_/brand/assets/jant-square-tile.svg",
    );
    expect(getJantIconHref("squareTilePng", "/demo")).toBe(
      "/demo/_/brand/assets/jant-square-tile-512.png",
    );
    expect(getJantIconHref("circleTileSvg")).toBe(
      "/_/brand/assets/jant-circle-tile.svg",
    );
    expect(getJantIconHref("circleTilePng", "/demo")).toBe(
      "/demo/_/brand/assets/jant-circle-tile-512.png",
    );
    expect(getJantIconHref("favicon")).toBe("/_/brand/assets/jant-favicon.ico");
    expect(getJantIconHref("socialImage", "/demo")).toBe(
      "/demo/_/brand/assets/jant-social-preview.png",
    );
    expect(getJantPositiveLogoPngHref("/demo")).toBe(
      "/demo/_/brand/assets/jant-logo-positive-512.png",
    );
    expect(getJantBrandPackHref("/demo")).toBe(
      "/demo/_/brand/assets/jant-brand-assets.zip",
    );
  });

  it("maps known filenames back to logo variants", () => {
    expect(getJantLogoVariantForFilename(getJantLogoFilename("positive"))).toBe(
      "positive",
    );
    expect(getJantLogoVariantForFilename(getJantLogoFilename("negative"))).toBe(
      "negative",
    );
    expect(getJantLogoVariantForFilename("jant-logo-unknown.svg")).toBeNull();
  });

  it("renders raw svg markup with the baked-in variant color", () => {
    expect(buildJantLogoSvgMarkup("positive")).toContain('fill="#3A5A40"');
    expect(buildJantLogoSvgMarkup("negative")).toContain('fill="#FFFFFF"');
    expect(buildJantLogoSvgMarkup("positive")).toContain(
      'viewBox="0 0 100 100"',
    );
  });

  it("renders the filled app icon svg markup", () => {
    expect(buildJantAppIconSvgMarkup()).toContain('rect width="100"');
    expect(buildJantAppIconSvgMarkup()).toContain('fill="#3A5A40"');
    expect(buildJantAppIconSvgMarkup()).toContain('fill="#FFFFFF"');
    expect(buildJantSquareTileSvgMarkup()).toContain('rx="0"');
    expect(buildJantCircleTileSvgMarkup()).toContain("<circle");
  });

  it("exposes bundled icon bytes for fallback routes", () => {
    expect(getDefaultJantFaviconIcoBytes()).not.toHaveLength(0);
    expect(getDefaultJantAppleTouchIconBytes()).not.toHaveLength(0);
    expect(getDefaultJantSocialImageBytes()).not.toHaveLength(0);
    expect(getDefaultJantPositiveLogoPngBytes()).not.toHaveLength(0);
    expect(getDefaultJantBrandTilePngBytes()).not.toHaveLength(0);
    expect(getDefaultJantSquareTilePngBytes()).not.toHaveLength(0);
    expect(getDefaultJantCircleTilePngBytes()).not.toHaveLength(0);
    expect(getDefaultJantBrandPackBytes()).not.toHaveLength(0);
  });

  it("resolves bundled assets by filename", () => {
    expect(getJantBundledAsset(getJantLogoFilename("positive"))).toMatchObject({
      contentType: "image/svg+xml; charset=utf-8",
    });
    expect(getJantBundledAsset(getJantIconFilename("favicon"))).toMatchObject({
      contentType: "image/x-icon",
    });
    expect(
      getJantBundledAsset(getJantIconFilename("brandTilePng")),
    ).toMatchObject({
      contentType: "image/png",
    });
    expect(
      getJantBundledAsset(getJantIconFilename("squareTileSvg")),
    ).toMatchObject({
      contentType: "image/svg+xml; charset=utf-8",
    });
    expect(
      getJantBundledAsset(getJantIconFilename("squareTilePng")),
    ).toMatchObject({
      contentType: "image/png",
    });
    expect(
      getJantBundledAsset(getJantIconFilename("circleTileSvg")),
    ).toMatchObject({
      contentType: "image/svg+xml; charset=utf-8",
    });
    expect(
      getJantBundledAsset(getJantIconFilename("circleTilePng")),
    ).toMatchObject({
      contentType: "image/png",
    });
    expect(
      getJantBundledAsset(getJantIconFilename("appleTouch")),
    ).toMatchObject({
      contentType: "image/png",
    });
    expect(getJantBundledAsset(JANT_POSITIVE_LOGO_PNG_FILENAME)).toMatchObject({
      contentType: "image/png",
    });
    expect(getJantBundledAsset(JANT_BRAND_PACK_FILENAME)).toMatchObject({
      contentType: "application/zip",
    });
    expect(getJantBundledAsset("jant-unknown.file")).toBeNull();
  });
});
