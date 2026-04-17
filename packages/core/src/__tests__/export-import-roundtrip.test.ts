/**
 * Export → Parse round-trip test.
 *
 * Builds a post markdown file through `buildPostMarkdown` and then parses
 * it back using the shared Zola markdown utilities (`parseFrontMatter` +
 * `splitReplies`) that the importer relies on. Asserts that every
 * timestamp, collection entry, position, and pinning flag survives the
 * round-trip intact.
 *
 * See tasks/featured-roundtrip-refactor.md for the format contract.
 */
import { describe, expect, it } from "vitest";
import { buildPostMarkdown } from "../services/export.js";
import { parseFrontMatter, splitReplies } from "../lib/zola-markdown.js";
import type { Post } from "../types.js";

const siteConfig = {
  siteName: "Jant",
  siteUrl: "https://example.com",
  siteDescription: "Roundtrip test",
  siteLanguage: "en",
  showJantBrandingOnHome: true,
  homeDefaultView: "latest" as const,
  siteFooter: "",
  showHeaderAvatar: false,
  siteAvatarUrl: "",
  themeId: "paper",
  defaultThemeId: "paper",
  fontThemeId: "system",
  themeMode: "auto" as const,
  noindex: false,
  navItems: [],
  pageSize: 50,
  archivePageSize: 50,
} as unknown as Parameters<typeof buildPostMarkdown>[8];

const T1 = 1772928000; // featured
const T2 = 1772841600; // pinned
const T3 = 1772755200; // collection A collected
const T4 = 1772668800; // collection A pinned
const T5 = 1773014400; // reply featured
const T6 = 1773100800; // reply collection A collected
const T7 = 1773014400; // root published
const T8 = 1773100800; // reply published

function makeRoot(): Post {
  return {
    id: "post-root",
    format: "note",
    status: "published",
    visibility: "public",
    pinnedAt: T2,
    featuredAt: T1,
    slug: "roundtrip-root",
    title: "Roundtrip root",
    url: null,
    body: null,
    bodyHtml: null,
    bodyText: "Root body text",
    quoteText: null,
    summary: "Root body text",
    rating: null,
    previewImageKey: null,
    previewKind: null,
    previewProvider: null,
    replyToId: null,
    threadId: "post-root",
    deletedAt: null,
    publishedAt: T7,
    lastActivityAt: T7,
    createdAt: T7,
    updatedAt: T7,
  };
}

function makeReply(): Post {
  return {
    ...makeRoot(),
    id: "post-reply",
    slug: "roundtrip-reply",
    title: null,
    pinnedAt: null,
    featuredAt: T5,
    replyToId: "post-root",
    threadId: "post-root",
    bodyText: "Reply body text",
    summary: "Reply body text",
    publishedAt: T8,
    lastActivityAt: T8,
    createdAt: T8,
    updatedAt: T8,
  };
}

describe("export/import roundtrip", () => {
  it("preserves featured_at, pinned_at, collection entries (root + reply)", async () => {
    const root = makeRoot();
    const reply = makeReply();

    const rootEntries = [
      {
        slug: "collection-a",
        collectedAt: T3,
        position: 5,
        pinnedAt: T4,
      },
      {
        slug: "collection-b",
        collectedAt: T3 + 100,
        position: 0,
        pinnedAt: null,
      },
    ];
    const replyEntriesByPost = new Map([
      [
        "post-reply",
        [
          {
            slug: "collection-a",
            collectedAt: T6,
            position: 2,
            pinnedAt: null,
          },
        ],
      ],
    ]);

    const slugMap = new Map([
      ["post-root", "roundtrip-root"],
      ["post-reply", "roundtrip-reply"],
    ]);
    const collectionSlugMap = new Map([
      ["col-a", "collection-a"],
      ["col-b", "collection-b"],
    ]);

    const markdown = buildPostMarkdown(
      root,
      [reply],
      rootEntries,
      { rootAliases: [], zolaAliases: ["/roundtrip-reply"] },
      slugMap,
      collectionSlugMap,
      [],
      new Map(),
      siteConfig,
      replyEntriesByPost,
    );

    // Parse front matter (TOML) and body
    const { frontMatter, body } = await parseFrontMatter(markdown);

    // Root: featured_at / pinned_at round-trip via extra.jant
    const jant = frontMatter.extra?.jant ?? {};
    expect(jant.featured_at).toBe(new Date(T1 * 1000).toISOString());
    expect(jant.pinned_at).toBe(new Date(T2 * 1000).toISOString());

    // Root: taxonomies.feed includes featured + pinned (not public, since
    // pinned posts get `pinned` instead)
    expect(frontMatter.taxonomies?.collections).toEqual([
      "collection-a",
      "collection-b",
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feed = (frontMatter.taxonomies as any)?.feed as string[] | undefined;
    expect(feed).toEqual(["pinned", "archive", "featured"]);

    // Root: per-entry collection metadata
    const rootCollections = jant.collections ?? [];
    expect(rootCollections).toHaveLength(2);
    const entryA = rootCollections.find((e) => e.slug === "collection-a");
    const entryB = rootCollections.find((e) => e.slug === "collection-b");
    expect(entryA).toMatchObject({
      slug: "collection-a",
      collected_at: new Date(T3 * 1000).toISOString(),
      position: 5,
      pinned_at: new Date(T4 * 1000).toISOString(),
    });
    expect(entryB).toMatchObject({
      slug: "collection-b",
      collected_at: new Date((T3 + 100) * 1000).toISOString(),
      position: 0,
    });
    // When not pinned in a given collection, pinned_at is omitted (not null).
    expect(entryB?.pinned_at).toBeUndefined();

    // Parse reply markers from body
    const segments = splitReplies(body);
    expect(segments).toHaveLength(2); // root segment + 1 reply
    const replySegment = segments[1];
    expect(replySegment?.attrs).not.toBeNull();
    const attrs = replySegment!.attrs!;

    // Reply: featured_at / pinned_at
    expect(attrs.featured_at).toBe(new Date(T5 * 1000).toISOString());
    expect(attrs.pinned_at).toBeNull();
    expect(attrs.slug).toBe("roundtrip-reply");
    expect(attrs.format).toBe("note");
    expect(attrs.status).toBe("published");
    expect(attrs.visibility).toBe("public");

    // Reply: per-entry collection metadata
    expect(attrs.collections).toHaveLength(1);
    expect(attrs.collections[0]).toMatchObject({
      slug: "collection-a",
      collected_at: new Date(T6 * 1000).toISOString(),
      position: 2,
      pinned_at: null,
    });
  });

  it("defensively escapes literal '-->' inside reply JSON string fields", async () => {
    // A reply whose quote contains the exact comment-terminator sequence.
    // The exporter must write it as `--\u003e` so the HTML comment stays
    // open, but JSON parses back the escape to `>` — the roundtrip should
    // recover the original string verbatim.
    const root = makeRoot();
    const reply: Post = {
      ...makeReply(),
      format: "quote",
      quoteText: "Bad sequence --> inside a quote",
      title: "Source with --> inside",
      url: "https://example.com/?x=-->",
    };

    const markdown = buildPostMarkdown(
      root,
      [reply],
      [],
      { rootAliases: [], zolaAliases: ["/roundtrip-reply"] },
      new Map([
        ["post-root", "roundtrip-root"],
        ["post-reply", "roundtrip-reply"],
      ]),
      new Map(),
      [],
      new Map(),
      siteConfig,
      new Map(),
    );

    // The raw markdown must not contain a premature comment terminator
    // anywhere inside the reply marker JSON body. (Excluding the final
    // `-->` that legitimately closes each marker.)
    const markerBody = markdown.match(/<!--jant:reply\n([\s\S]*?)\n-->/)?.[1];
    expect(markerBody).toBeDefined();
    expect(markerBody).not.toContain("-->");

    const { body } = await parseFrontMatter(markdown);
    const segments = splitReplies(body);
    const attrs = segments[1]?.attrs;
    expect(attrs).not.toBeNull();
    expect(attrs?.quote_text).toBe("Bad sequence --> inside a quote");
    expect(attrs?.source_name).toBe("Source with --> inside");
    expect(attrs?.source_url).toBe("https://example.com/?x=-->");
  });

  it("omits [extra.jant.collections] tables when the post has none", async () => {
    const root = makeRoot();
    const markdown = buildPostMarkdown(
      root,
      [],
      [],
      { rootAliases: [], zolaAliases: [] },
      new Map([["post-root", "roundtrip-root"]]),
      new Map(),
      [],
      new Map(),
      siteConfig,
      new Map(),
    );
    expect(markdown).not.toContain("[[extra.jant.collections]]");

    const { frontMatter } = await parseFrontMatter(markdown);
    // featured_at / pinned_at still present on the root
    expect(frontMatter.extra?.jant?.featured_at).toBe(
      new Date(T1 * 1000).toISOString(),
    );
    expect(frontMatter.extra?.jant?.pinned_at).toBe(
      new Date(T2 * 1000).toISOString(),
    );
    // collections field absent on jant
    expect(frontMatter.extra?.jant?.collections).toBeUndefined();
  });
});
