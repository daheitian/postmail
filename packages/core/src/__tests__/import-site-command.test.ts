import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { __test__ } from "../../bin/commands/import-site.js";

describe("import-site command helpers", () => {
  it("resolves exported relative media URLs against base_url", () => {
    expect(
      __test__.resolveImportUrl("/blog/media/file.webp", {
        base_url: "https://example.com/blog",
      }),
    ).toBe("https://example.com/blog/media/file.webp");
    expect(
      __test__.resolveImportUrl("media/file.webp", {
        base_url: "https://example.com/blog/",
      }),
    ).toBe("https://example.com/blog/media/file.webp");
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

  it("reads normalized media from a local file before falling back to fetch", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "jant-import-asset-"));
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    try {
      const filePath = join(rootDir, "photo.webp");
      await writeFile(filePath, "photo");

      const asset = await __test__.readMediaSpecAsset({
        src: "https://example.com/blog/media/photo.webp",
        srcFilePath: filePath,
        mimeType: "image/webp",
        originalName: "photo.webp",
      });

      expect(asset).toMatchObject({
        filename: "photo.webp",
        contentType: "image/webp",
      });
      expect(new TextDecoder().decode(asset?.bytes)).toBe("photo");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
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
    const rootDir = await mkdtemp(join(tmpdir(), "jant-import-icons-"));

    try {
      await mkdir(join(rootDir, "static"), { recursive: true });
      await writeFile(join(rootDir, "static", "favicon.ico"), "ico");
      await writeFile(
        join(rootDir, "static", "apple-touch-icon.png"),
        "apple-touch",
      );

      await expect(
        __test__.buildSiteAvatarImport(
          {
            base_url: "https://example.com/blog",
            extra: {
              jant_export: { format: "jant-site" },
              jant: {
                site_avatar_mode: "custom",
                favicon_mode: "custom",
                apple_touch_mode: "custom",
                site_avatar_url: "/blog/media/avatar.webp",
              },
            },
          },
          rootDir,
        ),
      ).resolves.toMatchObject({
        mode: "set",
        avatarUrl: "https://example.com/blog/media/avatar.webp",
        faviconUrl: "https://example.com/blog/favicon.ico",
        faviconFilePath: join(rootDir, "static", "favicon.ico"),
        appleTouchUrl: "https://example.com/blog/apple-touch-icon.png",
        appleTouchFilePath: join(rootDir, "static", "apple-touch-icon.png"),
      });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("keeps default exported site icons out of the avatar import payload", async () => {
    await expect(
      __test__.buildSiteAvatarImport({
        base_url: "https://example.com/blog",
        extra: {
          jant_export: { format: "jant-site" },
          jant: {
            site_avatar_mode: "custom",
            favicon_mode: "default",
            apple_touch_mode: "default",
            site_avatar_url: "/blog/media/avatar.webp",
          },
        },
      }),
    ).resolves.toMatchObject({
      mode: "set",
      avatarUrl: "https://example.com/blog/media/avatar.webp",
      faviconUrl: null,
      appleTouchUrl: null,
    });
  });

  it("detects incomplete remote setup from a /setup page response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>setup</html>", { status: 200 })),
    );

    try {
      await expect(
        __test__.detectRemoteSetupStatus("https://example.com/blog"),
      ).resolves.toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://example.com/blog/setup",
        { redirect: "manual" },
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("detects completed remote setup from a /setup redirect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 302 })),
    );

    try {
      await expect(
        __test__.detectRemoteSetupStatus("https://example.com/blog"),
      ).resolves.toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("warns when importing into a target that has not completed setup", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const warned = await __test__.warnIfTargetSetupIncomplete(
        {
          getSetupStatus: async () => false,
        },
        "Local target site",
      );

      expect(warned).toBe(true);
      expect(warnSpy).toHaveBeenNthCalledWith(1, "");
      expect(warnSpy).toHaveBeenNthCalledWith(
        2,
        __test__.buildIncompleteSetupWarning("Local target site"),
      );
      expect(warnSpy).toHaveBeenNthCalledWith(3, "");
    } finally {
      warnSpy.mockRestore();
    }
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

  it("maps quote posts to sourceName/sourceUrl for remote imports", () => {
    expect(
      __test__.toRemotePostPayload({
        format: "quote",
        title: "From Basho",
        url: "https://en.wikiquote.org/wiki/Matsuo_Basho",
        quoteText: "Every day is a journey.",
        slug: "from-basho",
      }),
    ).toEqual({
      format: "quote",
      sourceName: "From Basho",
      sourceUrl: "https://en.wikiquote.org/wiki/Matsuo_Basho",
      quoteText: "Every day is a journey.",
      slug: "from-basho",
    });
  });

  it("leaves non-quote remote post payloads unchanged", () => {
    expect(
      __test__.toRemotePostPayload({
        format: "link",
        title: "A useful link",
        url: "https://example.com",
        slug: "a-useful-link",
      }),
    ).toEqual({
      format: "link",
      title: "A useful link",
      url: "https://example.com",
      slug: "a-useful-link",
    });
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
