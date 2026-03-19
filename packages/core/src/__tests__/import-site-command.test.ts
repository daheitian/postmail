import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
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

  it("normalizes media specs with relative poster URLs", async () => {
    await expect(
      __test__.normalizeMediaSpec(
        {
          kind: "video",
          src: "/blog/media/video.mp4",
          poster: "media/video-poster.webp",
        },
        { base_url: "https://example.com/blog/" },
      ),
    ).resolves.toMatchObject({
      kind: "video",
      src: "https://example.com/blog/media/video.mp4",
      poster: "https://example.com/blog/media/video-poster.webp",
    });
  });

  it("prefers localized files from the export directory when present", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "jant-import-media-"));

    try {
      await mkdir(join(rootDir, "static", "media"), { recursive: true });
      await writeFile(join(rootDir, "static", "media", "photo.webp"), "photo");

      const normalized = await __test__.normalizeMediaSpec(
        {
          kind: "image",
          src: "/blog/media/photo.webp",
        },
        { base_url: "https://example.com/blog/" },
        rootDir,
      );

      expect(normalized).toMatchObject({
        src: "https://example.com/blog/media/photo.webp",
        srcFilePath: join(rootDir, "static", "media", "photo.webp"),
      });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("extracts text attachment payloads and ignores preview markup", () => {
    const result = __test__.extractAttachmentBlocks(`
Before

<div data-jant-node="attachments">
  <figure data-jant-node="attachment" data-jant-kind="text">
    <script type="application/json" data-jant-meta">{"kind":"text","contentFormat":"markdown","content":"# Attached note\\n\\nHello import","summary":"Attached note","chars":24}</script>
    <details>
      <summary>Attached note</summary>
      <div class="prose"><h1>Attached note</h1><p>Hello import</p></div>
    </details>
  </figure>
</div>

After
`);

    expect(result.markdown).toBe("Before\n\nAfter");
    expect(result.attachments).toEqual([
      {
        kind: "text",
        contentFormat: "markdown",
        content: "# Attached note\n\nHello import",
        summary: "Attached note",
        chars: 24,
      },
    ]);
  });

  it("builds imported attachments from embedded text and uploaded media", async () => {
    const uploadMedia = vi.fn(async () => ({
      id: "media-1",
      url: "https://example.com/blog/media/photo.jpg",
    }));

    const result = await __test__.buildImportedAttachments(
      [
        {
          kind: "text",
          contentFormat: "markdown",
          content: "# Attached note\n\nHello import",
          summary: "Attached note",
        },
        {
          kind: "image",
          src: "/blog/media/photo.jpg",
          alt: "Photo alt",
        },
      ],
      { uploadMedia },
      { base_url: "https://example.com/blog" },
    );

    expect(result).toEqual({
      attachments: [
        {
          type: "text",
          contentFormat: "markdown",
          content: "# Attached note\n\nHello import",
          summary: "Attached note",
        },
        {
          type: "media",
          mediaId: "media-1",
          alt: "Photo alt",
        },
      ],
      uploaded: 1,
    });
    expect(uploadMedia).toHaveBeenCalledOnce();
  });

  it("keeps embedded text attachments when media uploads are skipped", async () => {
    const uploadMedia = vi.fn();

    const result = await __test__.buildImportedAttachments(
      [
        {
          kind: "text",
          contentFormat: "markdown",
          content: "# Attached note\n\nHello import",
          summary: "Attached note",
        },
        {
          kind: "image",
          src: "/blog/media/photo.jpg",
        },
      ],
      { uploadMedia },
      { base_url: "https://example.com/blog" },
      { skipUploads: true },
    );

    expect(result).toEqual({
      attachments: [
        {
          type: "text",
          contentFormat: "markdown",
          content: "# Attached note\n\nHello import",
          summary: "Attached note",
        },
      ],
      uploaded: 0,
    });
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("treats missing avatar in a Jant export as avatar removal", async () => {
    await expect(
      __test__.buildSiteAvatarImport({
        base_url: "https://example.com/blog",
        extra: {
          jant_export: { format: "jant-site" },
          jant: {},
        },
      }),
    ).resolves.toEqual({ mode: "remove" });
  });

  it("resolves exported avatar URLs against base_url", async () => {
    await expect(
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
    ).resolves.toMatchObject({
      mode: "set",
      avatarUrl: "https://example.com/blog/media/avatar.webp",
      appleTouchUrl: "https://example.com/blog/favicon/apple-touch-icon.png",
    });
  });

  it("reads exported root aliases from extra.jant.root_aliases", () => {
    expect(
      __test__.getExportedRootAliases({
        extra: {
          jant: {
            root_aliases: ["/older-root", "legacy/path"],
          },
        },
      }),
    ).toEqual(["/older-root", "legacy/path"]);
  });

  it("rejects root aliases that collide with reply slugs", () => {
    const replySlugPaths = __test__.collectReplySlugPaths([
      { attrs: { slug: "reply-one" } },
      { attrs: { slug: "/reply-two" } },
      { attrs: {} },
    ]);

    expect(() =>
      __test__.getRootAliasPathsForImport(
        ["/root-post", "reply-one", "/older-root"],
        "root-post",
        replySlugPaths,
      ),
    ).toThrow('Exported root alias "/reply-one" conflicts with a reply slug');
  });
});
