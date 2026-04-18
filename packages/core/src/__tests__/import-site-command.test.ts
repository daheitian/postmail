/**
 * Tests for the Hugo import CLI helpers.
 *
 * Covers the walker (`walkHugoContent`), site-config merger
 * (`loadSiteConfig`), media resolver (`mediaSpecFromJantMedia`), collection
 * membership decoder, and the post-payload builder. A hand-authored Hugo
 * export tree is written to a temp dir per test so we exercise real fs
 * paths the CLI uses at runtime.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __test__ } from "../../bin/commands/import-site.js";

const {
  walkHugoContent,
  loadSiteConfig,
  mediaSpecFromJantMedia,
  resolveCollectionMemberships,
  buildPostPayloadFromBundle,
  getRootAliasPathsForImport,
} = __test__;

async function writeFileTree(
  rootDir: string,
  entries: Record<string, string | Uint8Array>,
): Promise<void> {
  for (const [rel, content] of Object.entries(entries)) {
    const target = join(rootDir, rel);
    await mkdir(join(target, "..").replace(/\/$/, ""), { recursive: true });
    const data =
      typeof content === "string" ? new TextEncoder().encode(content) : content;
    await writeFile(target, data);
  }
}

describe("Hugo import CLI helpers", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "jant-import-cmd-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("walkHugoContent classifies root posts, replies, and collection bundles", async () => {
    await writeFileTree(tempDir, {
      "content/_index.md": "---\ntype: home\n---\n",
      "content/ideas/_index.md":
        "---\ntitle: Ideas\nslug: ideas\ntype: collection\n---\n",
      "content/hello/_index.md":
        "---\nid: pst_root\ntitle: Hello\ndate: 2026-04-01T00:00:00Z\nslug: hello\ntype: post\nformat: note\nstatus: published\nvisibility: public\n---\nHello body\n",
      "content/hello/reply-a/index.md":
        "---\nid: pst_replya\ntitle: Reply A\ndate: 2026-04-01T01:00:00Z\nslug: reply-a\ntype: post\nbuild:\n  render: never\n  list: local\nformat: note\nstatus: published\nvisibility: public\n---\nReply A body\n",
      "content/hello/reply-b/index.md":
        "---\nid: pst_replyb\ntitle: Reply B\ndate: 2026-04-01T00:30:00Z\nslug: reply-b\ntype: post\nbuild:\n  render: never\n  list: local\nformat: note\nstatus: published\nvisibility: public\n---\nReply B body\n",
    });

    const { rootBundles, collectionBundles } = await walkHugoContent(tempDir);
    expect(rootBundles).toHaveLength(1);
    expect(collectionBundles).toHaveLength(1);
    expect(collectionBundles[0].slug).toBe("ideas");

    const root = rootBundles[0];
    expect(root.slug).toBe("hello");
    expect(root.children).toHaveLength(2);
    // Replies are sorted by date ascending: B (00:30) before A (01:00).
    expect(root.children.map((c: { slug: string }) => c.slug)).toEqual([
      "reply-b",
      "reply-a",
    ]);
  });

  it("loadSiteConfig merges hugo.toml + data/jant.toml + data/collection_directory.toml", async () => {
    await writeFileTree(tempDir, {
      "hugo.toml": [
        'baseURL = "https://example.com/"',
        'title = "Example Site"',
        'languageCode = "en"',
        'theme = "jant"',
        "[params]",
        '  description = "A description"',
        '  theme_id = "paper"',
        '  home_default_view = "featured"',
        "",
      ].join("\n"),
      "data/jant.toml": [
        'format = "jant-site"',
        "version = 1",
        'site_name = "Example Site"',
        'site_description = "A description"',
        'site_language = "en"',
        'home_default_view = "featured"',
        "show_jant_branding_on_home = true",
        "show_header_avatar = false",
        "noindex = false",
        'site_avatar_mode = "none"',
        'favicon_mode = "default"',
        'apple_touch_mode = "default"',
        'theme_id = "paper"',
        'default_theme_id = "paper"',
        'font_theme_id = "system"',
        'theme_mode = "auto"',
        "page_size = 10",
        "archive_page_size = 50",
        "",
        "[[nav]]",
        'type = "system"',
        'label = "Latest"',
        'url = "/"',
        'system_key = "latest"',
        'placement = "header"',
        "",
      ].join("\n"),
      "data/collection_directory.toml": [
        "[[items]]",
        'type = "divider"',
        'label = "Writing"',
        "",
        "[[items]]",
        'type = "collection"',
        'slug = "ideas"',
        'title = "Ideas"',
        "",
      ].join("\n"),
    });

    const siteConfig = await loadSiteConfig(tempDir);
    expect(siteConfig).not.toBeNull();
    expect(siteConfig.title).toBe("Example Site");
    expect(siteConfig.base_url).toBe("https://example.com/");
    expect(siteConfig.extra.jant.theme_id).toBe("paper");
    expect(siteConfig.extra.jant.home_default_view).toBe("featured");
    expect(siteConfig.extra.jant.nav_exported).toBe(true);
    expect(siteConfig.extra.jant.nav).toHaveLength(1);
    expect(siteConfig.extra.jant.collections_directory_exported).toBe(true);
    expect(siteConfig.extra.jant.collections_directory).toHaveLength(2);
  });

  it("mediaSpecFromJantMedia resolves site-relative src under static/", async () => {
    await mkdir(join(tempDir, "static", "media"), { recursive: true });
    await writeFile(join(tempDir, "static/media/med-1.webp"), "PHOTO");

    const spec = await mediaSpecFromJantMedia(
      {
        id: "med-1",
        src: "/media/med-1.webp",
        kind: "image",
        alt: "Alt text",
        width: 800,
        height: 600,
        blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
        original_name: "photo.webp",
        mime_type: "image/webp",
      },
      tempDir,
    );
    expect(spec).toMatchObject({
      kind: "image",
      src: "/media/med-1.webp",
      srcFilePath: join(tempDir, "static/media/med-1.webp"),
      originalName: "photo.webp",
      mimeType: "image/webp",
      alt: "Alt text",
      width: 800,
      height: 600,
      blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
    });
  });

  it("mediaSpecFromJantMedia passes through absolute URLs without a disk lookup", async () => {
    const spec = await mediaSpecFromJantMedia(
      {
        id: "med-cdn",
        src: "https://cdn.example.com/media/med-cdn.webp",
        kind: "image",
      },
      tempDir,
    );
    expect(spec).toMatchObject({
      kind: "image",
      src: "https://cdn.example.com/media/med-cdn.webp",
      srcFilePath: null,
    });
  });

  it("mediaSpecFromJantMedia returns null when a relative src has no file on disk", async () => {
    const spec = await mediaSpecFromJantMedia(
      { id: "med-missing", src: "/media/nope.webp", kind: "image" },
      tempDir,
    );
    expect(spec).toBeNull();
  });

  it("resolveCollectionMemberships drops unknown slugs and converts timestamps to seconds", () => {
    const slugToId = new Map([["ideas", "col_known"]]);
    const fm = {
      collections: [
        {
          slug: "ideas",
          collected_at: "2026-03-06T08:00:00Z",
          position: 2,
          pinned_at: "2026-03-06T21:53:20Z",
        },
        { slug: "unknown", collected_at: "2026-03-06T08:00:00Z" },
      ],
    };
    const { entries, ids } = resolveCollectionMemberships(fm, slugToId);
    expect(ids).toEqual(["col_known"]);
    expect(entries).toEqual([
      {
        collectionId: "col_known",
        createdAt: Math.floor(
          new Date("2026-03-06T08:00:00Z").getTime() / 1000,
        ),
        position: 2,
        pinnedAt: Math.floor(new Date("2026-03-06T21:53:20Z").getTime() / 1000),
      },
    ]);
  });

  it("buildPostPayloadFromBundle translates front matter into createPost input", () => {
    const bundle = {
      slug: "hello",
      frontMatter: {
        id: "pst_root",
        title: "Hello",
        date: "2026-04-01T00:00:00Z",
        slug: "hello",
        type: "post",
        format: "note",
        status: "published",
        visibility: "public",
        featured_at: "2026-04-02T00:00:00Z",
        pinned_at: "2026-04-03T00:00:00Z",
        rating: 4,
      },
      body: "Body text",
    };
    const data = buildPostPayloadFromBundle(bundle, {
      bodyMarkdown: "Body text",
      attachments: [],
      memberships: { entries: [], ids: [] },
      replyToId: null,
    });
    expect(data).toMatchObject({
      format: "note",
      title: "Hello",
      slug: "hello",
      status: "published",
      bodyMarkdown: "Body text",
      publishedAt: Math.floor(
        new Date("2026-04-01T00:00:00Z").getTime() / 1000,
      ),
      featuredAt: Math.floor(new Date("2026-04-02T00:00:00Z").getTime() / 1000),
      pinnedAt: Math.floor(new Date("2026-04-03T00:00:00Z").getTime() / 1000),
      rating: 4,
    });
  });

  it("buildPostPayloadFromBundle emits quote-format fields with sourceName/url mapping", () => {
    const bundle = {
      slug: "from-basho",
      frontMatter: {
        id: "pst_q",
        slug: "from-basho",
        type: "post",
        format: "quote",
        status: "published",
        visibility: "public",
        source_name: "Basho",
        source_url: "https://example.com/basho",
        quote_text: "An old silent pond…",
        date: "2026-04-01T00:00:00Z",
      },
      body: "",
    };
    const data = buildPostPayloadFromBundle(bundle, {
      bodyMarkdown: "",
      attachments: [],
      memberships: { entries: [], ids: [] },
      replyToId: "pst_root",
    });
    expect(data).toMatchObject({
      format: "quote",
      title: "Basho",
      quoteText: "An old silent pond…",
      url: "https://example.com/basho",
      replyToId: "pst_root",
    });
  });

  it("getRootAliasPathsForImport prefers root_aliases and strips reply slugs", () => {
    // Reply slug paths are normalized (no trailing slash) to match the
    // return format of normalizeImportAliasPath.
    const replySlugPaths = new Set(["/reply-a"]);
    const paths = getRootAliasPathsForImport(
      ["/old-slug/", "/reply-a/", "/hello/"],
      ["/historic-slug/"],
      "hello",
      replySlugPaths,
    );
    expect(paths).toEqual(["/historic-slug"]);
  });

  it("getRootAliasPathsForImport falls back to aliases minus reply slugs when root_aliases is empty", () => {
    const replySlugPaths = new Set(["/reply-a"]);
    const paths = getRootAliasPathsForImport(
      ["/old-slug/", "/reply-a/", "/hello/"],
      [],
      "hello",
      replySlugPaths,
    );
    expect(paths).toEqual(["/old-slug"]);
  });
});
