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
