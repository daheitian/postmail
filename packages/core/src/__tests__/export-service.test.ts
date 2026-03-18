import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { createExportService } from "../services/export.js";
import type { Collection, Post } from "../types.js";

function decodeZipEntry(
  files: Record<string, Uint8Array>,
  path: string,
): string | null {
  const entry = files[path];
  return entry ? new TextDecoder().decode(entry) : null;
}

describe("createExportService", () => {
  it("exports collection metadata under content/c and includes archive fallback metadata", async () => {
    const rootPost: Post = {
      id: "post-1",
      format: "note",
      status: "published",
      visibility: "public",
      pinnedAt: null,
      featuredAt: null,
      slug: "desk-note",
      title: null,
      url: null,
      body: null,
      bodyHtml: null,
      bodyText:
        "Took the long way home because the light was good and the air finally felt like spring.",
      quoteText: null,
      summary:
        "Took the long way home because the light was good and the air finally felt like spring.",
      rating: null,
      replyToId: null,
      threadId: "post-1",
      deletedAt: null,
      publishedAt: 1773014400,
      lastActivityAt: 1773014400,
      createdAt: 1773014400,
      updatedAt: 1773014400,
    };

    const collection: Collection = {
      id: "collection-1",
      slug: "programming",
      title: "编程开发",
      description: "Posts about building and shipping software.",
      sortOrder: "newest",
      createdAt: 1773014400,
      updatedAt: 1773014400,
    };

    const services = {
      posts: {
        list: async () => [rootPost],
      },
      paths: {
        getPostSlugMap: async () => new Map([["post-1", "desk-note"]]),
        getPostAliases: async () => new Map([["post-1", []]]),
        getCollectionSlugMap: async () =>
          new Map([["collection-1", "programming"]]),
      },
      collections: {
        list: async () => [collection],
        getCollectionsByPostIds: async () =>
          new Map([["post-1", [collection]]]),
      },
      media: {
        getByPostIds: async () => new Map(),
      },
    } as unknown as Parameters<typeof createExportService>[0];

    const siteConfig: Parameters<typeof createExportService>[1] = {
      siteName: "Jant",
      siteUrl: "https://example.com",
      siteDescription: "Export test",
      siteLanguage: "zh-CN",
      showJantBrandingOnHome: true,
      homeDefaultView: "latest",
      headerNavMaxVisible: 4,
      siteFooter: "",
      showHeaderAvatar: false,
      siteAvatarUrl: "",
      themeId: "paper",
      defaultThemeId: "paper",
      fontThemeId: "system",
      themeMode: "auto",
      noindex: false,
      navItems: [],
    };

    const zip = await createExportService(
      services,
      siteConfig,
    ).generateZolaSite();
    const files = unzipSync(zip);

    const collectionMetadata = decodeZipEntry(
      files,
      "content/c/programming/_index.md",
    );
    const postMarkdown = decodeZipEntry(files, "content/desk-note/index.md");
    const archiveTemplate = decodeZipEntry(files, "templates/archive.html");
    const taxonomyListTemplate = decodeZipEntry(
      files,
      "templates/taxonomy_list.html",
    );
    const atomTemplate = decodeZipEntry(files, "templates/atom.xml");

    expect(collectionMetadata).toContain('title = "编程开发"');
    expect(collectionMetadata).toContain(
      'description = "Posts about building and shipping software."',
    );
    expect(postMarkdown).toContain("summary_text:");
    expect(postMarkdown).not.toContain("archive_month:");
    expect(postMarkdown).not.toContain("archive_month_label:");
    expect(archiveTemplate).toContain('group_by(attribute="year")');
    expect(archiveTemplate).toContain('group_by(attribute="month")');
    expect(archiveTemplate).toContain("page.extra.summary_text");
    expect(archiveTemplate).toContain(
      "get_section(path='c/' ~ col ~ '/_index.md')",
    );
    expect(taxonomyListTemplate).toContain("term.pages | length");
    expect(taxonomyListTemplate).toContain("latest_page.updated");
    expect(atomTemplate).toContain('rel="self" type="application/atom+xml"');
    expect(atomTemplate).toContain('href="{{ feed_url | safe }}" />');
    expect(atomTemplate).toContain("page.extra.summary_text");
    expect(atomTemplate).toContain('<summary type="text">');
    expect(atomTemplate).toContain("&lt;p&gt;{{ entry_summary }}&lt;/p&gt;");
    expect(atomTemplate).not.toContain("page.content | safe");
    expect(atomTemplate).not.toContain('<summary type="html">{{ page.summary');
    expect(atomTemplate).not.toContain('<content type="html">{{ page.content');
  });
});
