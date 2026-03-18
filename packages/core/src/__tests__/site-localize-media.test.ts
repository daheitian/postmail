import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectMediaReferences,
  getSitePathPrefix,
  localizeSiteExportDirectory,
  resolveExportUrl,
  toLocalizedPublicPath,
  updateConfigMediaUrls,
} from "../../bin/lib/site-localize-media.js";

describe("site-localize-media helpers", () => {
  it("collects markdown, html, and attachment media references", () => {
    const content = `
![hero](/media/hero.webp)
<img src="https://example.com/inline.png" alt="">
<video poster="/media/poster.webp"><source src="/media/clip.mp4"></video>
<audio src="/media/memo.mp3"></audio>
<div data-jant-node="attachments">
  <figure data-jant-node="attachment">
    <script type="application/json" data-jant-meta>{"src":"/media/doc.pdf","poster":"/media/doc-poster.webp"}</script>
  </figure>
</div>
`;

    expect(collectMediaReferences(content)).toEqual([
      "/media/hero.webp",
      "https://example.com/inline.png",
      "/media/memo.mp3",
      "/media/clip.mp4",
      "/media/poster.webp",
      "/media/doc.pdf",
      "/media/doc-poster.webp",
    ]);
  });

  it("builds localized public paths with a site path prefix", () => {
    expect(getSitePathPrefix("https://example.com/blog")).toBe("/blog");
    expect(toLocalizedPublicPath("media/photo.webp", "/blog")).toBe(
      "/blog/media/photo.webp",
    );
    expect(
      resolveExportUrl("/media/photo.webp", "https://example.com/blog"),
    ).toBe("https://example.com/media/photo.webp");
  });

  it("updates config media URLs when replacements exist", () => {
    const config = {
      extra: {
        jant: {
          site_avatar_url: "https://origin.example/media/avatar.webp",
          apple_touch_icon_url: "https://origin.example/media/apple-touch.png",
          favicon_url: "https://origin.example/media/avatar.webp",
        },
      },
    };
    const replacements = new Map([
      [
        "https://origin.example/media/avatar.webp",
        "/blog/media/local-avatar.webp",
      ],
      [
        "https://origin.example/media/apple-touch.png",
        "/blog/media/local-apple-touch.png",
      ],
    ]);

    expect(updateConfigMediaUrls(config, replacements)).toBe(true);
    expect(config.extra.jant.site_avatar_url).toBe(
      "/blog/media/local-avatar.webp",
    );
    expect(config.extra.jant.apple_touch_icon_url).toBe(
      "/blog/media/local-apple-touch.png",
    );
    expect(config.extra.jant.favicon_url).toBe("/blog/media/local-avatar.webp");
  });

  it("localizes media files into static/media and rewrites content/config", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "jant-localize-test-"));

    try {
      await mkdir(join(rootDir, "content", "hello"), { recursive: true });
      await writeFile(
        join(rootDir, "config.toml"),
        `base_url = "https://example.com/blog"

[extra.jant]
site_avatar_url = "/media/avatar.webp"
apple_touch_icon_url = "/media/apple-touch.png"
favicon_url = "/media/avatar.webp"
`,
      );
      await writeFile(
        join(rootDir, "content", "hello", "index.md"),
        `---
title: "Hello"
---

![hero](/media/hero.webp)

<div data-jant-node="attachments">
  <figure data-jant-node="attachment">
    <script type="application/json" data-jant-meta>{"src":"/media/report.pdf"}</script>
    <a href="/media/report.pdf">report.pdf</a>
  </figure>
</div>
`,
      );

      const stats = await localizeSiteExportDirectory(rootDir, {
        assetLoader: async ({ resolvedUrl }) => ({
          bytes: new TextEncoder().encode(resolvedUrl),
          contentType: resolvedUrl.endsWith(".pdf")
            ? "application/pdf"
            : "image/webp",
        }),
      });

      expect(stats.downloaded).toBe(4);
      expect(stats.filesUpdated).toBe(1);
      expect(stats.configUpdated).toBe(true);

      const content = await readFile(
        join(rootDir, "content", "hello", "index.md"),
        "utf-8",
      );
      expect(content).toContain("/blog/media/");
      expect(content).not.toContain('"/media/hero.webp"');
      expect(content).not.toContain('"/media/report.pdf"');

      const config = await readFile(join(rootDir, "config.toml"), "utf-8");
      expect(config).toContain('site_avatar_url = "/blog/media/');
      expect(config).toContain('apple_touch_icon_url = "/blog/media/');

      const localizedFiles = await readdir(join(rootDir, "static", "media"));
      expect(localizedFiles).toHaveLength(4);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
