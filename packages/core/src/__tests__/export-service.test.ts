/**
 * Tests for the Hugo-shaped export service.
 *
 * Exercises `createExportService(...).generateHugoFiles()` and
 * `generateHugoSite()` on small hand-built fixtures. Assertions target the
 * actual Hugo output tree: branch bundles, reply leaf bundles, flat YAML
 * front matter with stable key order, section discriminators, the bundled
 * Jant theme, and the `data/*.toml` files consumed by templates.
 */

import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { createExportService } from "../services/export.js";
import { parseFrontMatter } from "../lib/hugo-markdown.js";
import type { Collection, Media, Post } from "../types.js";
import {
  makeCollection,
  makeMedia,
  makePost,
  makeSiteConfig,
} from "./helpers/export-fixtures.js";

type ServicesArg = Parameters<typeof createExportService>[0];

interface FixtureOptions {
  posts: Post[];
  collections?: Collection[];
  collectionsByPost?: Map<string, Collection[]>;
  collectionEntriesByPost?: Map<
    string,
    {
      collectionId: string;
      createdAt: number;
      position: number;
      pinnedAt: number | null;
    }[]
  >;
  mediaByPost?: Map<string, Media[]>;
  slugMap?: Map<string, string>;
  aliasMap?: Map<string, string[]>;
  collectionSlugMap?: Map<string, string>;
  directoryItems?: unknown[];
}

function buildServices(opts: FixtureOptions): ServicesArg {
  const {
    posts,
    collections = [],
    collectionsByPost = new Map(),
    collectionEntriesByPost = new Map(),
    mediaByPost = new Map(),
    slugMap = new Map(posts.map((p) => [p.id, p.slug])),
    aliasMap = new Map(),
    collectionSlugMap = new Map(collections.map((c) => [c.id, c.slug])),
    directoryItems,
  } = opts;

  return {
    posts: {
      list: async () => posts,
    },
    paths: {
      getPostSlugMap: async () => slugMap,
      getPostAliases: async () => aliasMap,
      getCollectionSlugMap: async () => collectionSlugMap,
    },
    collections: {
      list: async () => collections,
      listDirectoryData: async () => ({
        collections: [],
        items:
          directoryItems ??
          collections.map((collection) => ({
            id: `dir-${collection.id}`,
            type: "collection" as const,
            collection: {
              ...collection,
              postCount: 0,
              recentActivityAt: collection.updatedAt,
            },
          })),
        directoryItems: [],
      }),
      getCollectionsByPostIds: async () => collectionsByPost,
      getCollectionEntriesByPostIds: async () => collectionEntriesByPost,
    },
    media: {
      getByPostIds: async () => mediaByPost,
    },
  } as unknown as ServicesArg;
}

function filesToMap(
  list: { path: string; content: string | Uint8Array }[],
): Map<string, string | Uint8Array> {
  const map = new Map<string, string | Uint8Array>();
  for (const f of list) map.set(f.path, f.content);
  return map;
}

describe("createExportService (Hugo)", () => {
  it("emits a branch bundle per root post with YAML front matter in stable key order", async () => {
    const root = makePost({
      id: "post-root",
      slug: "hello-world",
      title: "Hello World",
      featuredAt: 1773100000,
      pinnedAt: 1773200000,
      format: "note",
    });

    const service = createExportService(
      buildServices({ posts: [root] }),
      makeSiteConfig(),
    );
    const files = filesToMap(await service.generateHugoFiles());

    const indexPath = "content/hello-world/_index.md";
    const md = files.get(indexPath);
    expect(md).toBeDefined();
    const text = typeof md === "string" ? md : new TextDecoder().decode(md!);

    // Starts with YAML delimiter
    expect(text.startsWith("---\n")).toBe(true);

    // Stable key order: id, title, date, slug, type, featured_at, pinned_at
    const headerLines = text
      .split("\n")
      .slice(1, text.split("\n").indexOf("---", 1))
      .map((line) => line.split(":")[0]);
    const orderedExpected = [
      "id",
      "title",
      "date",
      "slug",
      "type",
      "format",
      "status",
      "visibility",
      "summary_text",
      "featured_at",
      "pinned_at",
    ];
    let cursor = -1;
    for (const key of orderedExpected) {
      const idx = headerLines.indexOf(key);
      expect(idx).toBeGreaterThan(cursor);
      cursor = idx;
    }

    const { frontMatter } = await parseFrontMatter(text);
    expect(frontMatter.id).toBe("post-root");
    expect(frontMatter.slug).toBe("hello-world");
    expect(frontMatter.type).toBe("post");
    expect(frontMatter.format).toBe("note");
    expect(frontMatter.featured_at).toBe(
      new Date(1773100000 * 1000).toISOString(),
    );
    expect(frontMatter.pinned_at).toBe(
      new Date(1773200000 * 1000).toISOString(),
    );
  });

  it("emits reply bundles with build.render=never and no aliases key", async () => {
    const root = makePost({
      id: "post-root",
      slug: "thread-root",
      threadId: "post-root",
    });
    const reply = makePost({
      id: "post-reply",
      slug: "reply-one",
      title: "Reply title",
      replyToId: "post-root",
      threadId: "post-root",
      createdAt: 1773018000,
      publishedAt: 1773018000,
    });

    const service = createExportService(
      buildServices({ posts: [root, reply] }),
      makeSiteConfig(),
    );
    const files = filesToMap(await service.generateHugoFiles());

    const rootPath = "content/thread-root/_index.md";
    const replyPath = "content/thread-root/reply-one/index.md";
    expect(files.has(rootPath)).toBe(true);
    expect(files.has(replyPath)).toBe(true);

    const rootText = files.get(rootPath) as string;
    const replyText = files.get(replyPath) as string;

    const { frontMatter: rootFm } = await parseFrontMatter(rootText);
    const { frontMatter: replyFm } = await parseFrontMatter(replyText);

    // Root aliases contain the reply slug path.
    expect(rootFm.aliases).toEqual(expect.arrayContaining(["/reply-one/"]));

    // Reply has build.render=never, build.list=local, no aliases.
    expect(replyFm.build).toEqual({ render: "never", list: "local" });
    expect(replyFm.aliases).toBeUndefined();
    expect(replyFm.type).toBe("post");
    expect(replyFm.id).toBe("post-reply");
  });

  it("merges historical root aliases + reply slugs onto the root", async () => {
    const root = makePost({ id: "r", slug: "new-slug", threadId: "r" });
    const reply = makePost({
      id: "rep",
      slug: "reply-a",
      replyToId: "r",
      threadId: "r",
      createdAt: 1773018000,
      publishedAt: 1773018000,
    });

    const service = createExportService(
      buildServices({
        posts: [root, reply],
        aliasMap: new Map([["r", ["/old-slug/", "/older-slug/"]]]),
      }),
      makeSiteConfig(),
    );
    const files = filesToMap(await service.generateHugoFiles());
    const rootText = files.get("content/new-slug/_index.md") as string;
    const { frontMatter } = await parseFrontMatter(rootText);

    expect(frontMatter.aliases).toEqual([
      "/old-slug/",
      "/older-slug/",
      "/reply-a/",
    ]);
    expect(frontMatter.root_aliases).toEqual(["/old-slug/", "/older-slug/"]);
  });

  it("emits home/featured/archive/collections section pages with type discriminators", async () => {
    const service = createExportService(
      buildServices({ posts: [makePost()] }),
      makeSiteConfig(),
    );
    const files = filesToMap(await service.generateHugoFiles());

    for (const [path, expectedType] of [
      ["content/_index.md", "home"],
      ["content/featured/_index.md", "featured"],
      ["content/archive/_index.md", "archive"],
      ["content/collections/_index.md", "collections"],
    ] as const) {
      const raw = files.get(path);
      expect(raw, `missing ${path}`).toBeDefined();
      const { frontMatter } = await parseFrontMatter(raw as string);
      expect(frontMatter.type).toBe(expectedType);
    }
  });

  it("emits a per-collection branch bundle with type=collection", async () => {
    const collection = makeCollection({
      id: "col-1",
      slug: "ideas",
      title: "Ideas",
      description: "Half-formed thoughts",
    });
    const service = createExportService(
      buildServices({ posts: [], collections: [collection] }),
      makeSiteConfig(),
    );
    const files = filesToMap(await service.generateHugoFiles());
    const raw = files.get("content/ideas/_index.md");
    expect(raw).toBeDefined();
    const { frontMatter } = await parseFrontMatter(raw as string);
    expect(frontMatter.type).toBe("collection");
    expect(frontMatter.slug).toBe("ideas");
    expect(frontMatter.title).toBe("Ideas");
    expect(frontMatter.summary_text).toBe("Half-formed thoughts");
  });

  it("writes hugo.toml with baseURL, theme=jant, [permalinks] post=/:slug/, and [params]", async () => {
    const service = createExportService(
      buildServices({ posts: [] }),
      makeSiteConfig({
        siteName: "My Site",
        siteUrl: "https://my.example",
        homeDefaultView: "featured",
      }),
    );
    const files = filesToMap(await service.generateHugoFiles());
    const toml = files.get("hugo.toml") as string;
    expect(toml).toBeDefined();
    expect(toml).toContain('baseURL = "https://my.example/"');
    expect(toml).toContain('title = "My Site"');
    expect(toml).toContain('theme = "jant"');
    expect(toml).toMatch(/\[permalinks\][\s\S]*post = "\/:slug\/"/);
    expect(toml).toContain("[params]");
    expect(toml).toContain('home_default_view = "featured"');
  });

  it("lowercases BCP-47 language codes in hugo.toml so Hugo accepts them", async () => {
    // Hugo rejects mixed-case language codes like `zh-Hant` with
    // "must be all lower case and no spaces" — so the exporter has to
    // normalize the site language even though Jant stores BCP-47 casing.
    const service = createExportService(
      buildServices({ posts: [] }),
      makeSiteConfig({ siteLanguage: "zh-Hant" }),
    );
    const files = filesToMap(await service.generateHugoFiles());
    const toml = files.get("hugo.toml") as string;
    expect(toml).toContain('languageCode = "zh-hant"');
    expect(toml).toContain('defaultContentLanguage = "zh-hant"');
    expect(toml).not.toContain("zh-Hant");
  });

  it("emits data/jant.toml and data/collection_directory.toml that parse", async () => {
    const collection = makeCollection({ id: "col-1", slug: "ideas" });
    const service = createExportService(
      buildServices({
        posts: [],
        collections: [collection],
        directoryItems: [
          { id: "d1", type: "divider" as const, label: "Writing" },
          {
            id: "c1",
            type: "collection" as const,
            collection: {
              ...collection,
              postCount: 0,
              recentActivityAt: collection.updatedAt,
            },
          },
          {
            id: "l1",
            type: "link" as const,
            label: "Elsewhere",
            url: "https://example.com/elsewhere",
          },
        ],
      }),
      makeSiteConfig({
        navItems: [
          {
            type: "system",
            systemKey: "latest",
            label: "",
            url: "/latest",
            position: "a0",
            placement: "header",
          },
        ],
      }),
    );
    const files = filesToMap(await service.generateHugoFiles());
    const jantData = files.get("data/jant.toml") as string;
    const colDir = files.get("data/collection_directory.toml") as string;
    expect(jantData).toBeDefined();
    expect(colDir).toBeDefined();

    const { parse } = await import("smol-toml");
    const jant = parse(jantData);
    const col = parse(colDir);
    expect(jant.format).toBe("jant-site");
    expect(jant.site_name).toBe("Jant Test");
    expect(Array.isArray(jant.nav)).toBe(true);
    expect(Array.isArray(col.items)).toBe(true);
    expect((col.items as unknown[]).length).toBe(3);
  });

  it("bundles the Jant theme with layouts and CSS files", async () => {
    const service = createExportService(
      buildServices({ posts: [] }),
      makeSiteConfig(),
    );
    const files = filesToMap(await service.generateHugoFiles());

    const expectedLayouts = [
      "themes/jant/theme.toml",
      "themes/jant/layouts/_default/baseof.html",
      "themes/jant/layouts/_default/single.html",
      "themes/jant/layouts/_default/list.html",
      "themes/jant/layouts/_default/alias.html",
      "themes/jant/layouts/index.html",
      "themes/jant/layouts/post/list.html",
      "themes/jant/layouts/featured/list.html",
      "themes/jant/layouts/archive/list.html",
      "themes/jant/layouts/collections/list.html",
      "themes/jant/layouts/collection/single.html",
      "themes/jant/layouts/partials/head.html",
      "themes/jant/layouts/partials/header.html",
      "themes/jant/layouts/partials/footer.html",
      "themes/jant/layouts/partials/pagination.html",
      "themes/jant/layouts/partials/post-card.html",
      "themes/jant/layouts/partials/reply.html",
    ];
    for (const path of expectedLayouts) {
      expect(files.has(path), `missing ${path}`).toBe(true);
    }

    expect(files.has("themes/jant/static/main.css")).toBe(true);
    expect(files.has("themes/jant/static/tokens.css")).toBe(true);
    expect(files.has("themes/jant/static/theme.css")).toBe(true);
    expect(files.has("themes/jant/static/custom.css")).toBe(true);
  });

  it("writes a .gitignore covering Hugo build artifacts", async () => {
    const service = createExportService(
      buildServices({ posts: [] }),
      makeSiteConfig(),
    );
    const files = filesToMap(await service.generateHugoFiles());
    const gitignore = files.get(".gitignore") as string;
    expect(gitignore).toBeDefined();
    expect(gitignore).toMatch(/public\//);
    expect(gitignore).toMatch(/resources\//);
    expect(gitignore).toMatch(/\.hugo_build\.lock/);
  });

  it("generateHugoSite() returns a valid zip archive", async () => {
    const service = createExportService(
      buildServices({ posts: [makePost()] }),
      makeSiteConfig(),
    );
    const zip = await service.generateHugoSite();
    expect(zip).toBeInstanceOf(Uint8Array);
    expect(zip.byteLength).toBeGreaterThan(0);
    // ZIP magic: PK\x03\x04
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
    const decoded = unzipSync(zip);
    expect(Object.keys(decoded)).toContain("hugo.toml");
  });

  it("round-trips collection memberships on each post's front matter", async () => {
    const collection = makeCollection({ id: "col-1", slug: "ideas" });
    const root = makePost({ id: "post-root", slug: "entry-a" });
    const entries = new Map<
      string,
      {
        collectionId: string;
        createdAt: number;
        position: number;
        pinnedAt: number | null;
      }[]
    >();
    entries.set("post-root", [
      {
        collectionId: "col-1",
        createdAt: 1773000000,
        position: 3,
        pinnedAt: 1773050000,
      },
    ]);
    const service = createExportService(
      buildServices({
        posts: [root],
        collections: [collection],
        collectionEntriesByPost: entries,
      }),
      makeSiteConfig(),
    );
    const files = filesToMap(await service.generateHugoFiles());
    const { frontMatter } = await parseFrontMatter(
      files.get("content/entry-a/_index.md") as string,
    );
    expect(frontMatter.collections).toEqual([
      {
        slug: "ideas",
        collected_at: new Date(1773000000 * 1000).toISOString(),
        position: 3,
        pinned_at: new Date(1773050000 * 1000).toISOString(),
      },
    ]);
  });

  it("emits resources[] for each media attached to a post", async () => {
    const root = makePost({ id: "post-root", slug: "with-media" });
    const media = makeMedia({
      id: "med-1",
      filename: "photo.webp",
      width: 1024,
      height: 768,
      alt: "A red lantern",
      blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
    });
    const service = createExportService(
      buildServices({
        posts: [root],
        mediaByPost: new Map([["post-root", [media]]]),
      }),
      makeSiteConfig(),
    );
    const files = filesToMap(await service.generateHugoFiles());
    const { frontMatter } = await parseFrontMatter(
      files.get("content/with-media/_index.md") as string,
    );
    expect(Array.isArray(frontMatter.resources)).toBe(true);
    const resource = frontMatter.resources![0];
    expect(resource.src).toBe("med-1.webp");
    expect(resource.name).toBe("med-1");
    expect(resource.params?.kind).toBe("image");
    expect(resource.params?.alt).toBe("A red lantern");
    expect(resource.params?.width).toBe(1024);
    expect(resource.params?.height).toBe(768);
    expect(resource.params?.blurhash).toBe("L6PZfSi_.AyE_3t7t7R**0o#DgR4");
  });
});
