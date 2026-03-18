import { describe, expect, it } from "vitest";
import { __test__ } from "../../bin/commands/import-site.js";

describe("import-site command helpers", () => {
  it("resolves exported relative media URLs against base_url", () => {
    expect(
      __test__.resolveImportUrl("/blog/media/2026/03/file.webp", {
        base_url: "https://example.com/blog",
      }),
    ).toBe("https://example.com/blog/media/2026/03/file.webp");
    expect(
      __test__.resolveImportUrl("media/2026/03/file.webp", {
        base_url: "https://example.com/blog/",
      }),
    ).toBe("https://example.com/blog/media/2026/03/file.webp");
  });

  it("keeps data URLs unchanged", () => {
    expect(
      __test__.resolveImportUrl("data:image/png;base64,abc", {
        base_url: "https://example.com/blog",
      }),
    ).toBe("data:image/png;base64,abc");
  });

  it("normalizes media specs with relative poster URLs", () => {
    expect(
      __test__.normalizeMediaSpec(
        {
          kind: "video",
          src: "/blog/media/video.mp4",
          poster: "media/video-poster.webp",
        },
        { base_url: "https://example.com/blog/" },
      ),
    ).toMatchObject({
      kind: "video",
      src: "https://example.com/blog/media/video.mp4",
      poster: "https://example.com/blog/media/video-poster.webp",
    });
  });

  it("treats missing avatar in a Jant export as avatar removal", () => {
    expect(
      __test__.buildSiteAvatarImport({
        base_url: "https://example.com/blog",
        extra: {
          jant_export: { format: "jant-site" },
          jant: {},
        },
      }),
    ).toEqual({ mode: "remove" });
  });

  it("resolves exported avatar URLs against base_url", () => {
    expect(
      __test__.buildSiteAvatarImport({
        base_url: "https://example.com/blog",
        extra: {
          jant_export: { format: "jant-site" },
          jant: {
            site_avatar_url: "/blog/media/avatar.webp",
            apple_touch_icon_url: "/blog/favicon/apple-touch-icon.png",
          },
        },
      }),
    ).toEqual({
      mode: "set",
      avatarUrl: "https://example.com/blog/media/avatar.webp",
      appleTouchUrl: "https://example.com/blog/favicon/apple-touch-icon.png",
    });
  });
});
