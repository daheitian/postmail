import type { Context } from "hono";
import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../../i18n/context.js";
import { createI18n } from "../../../i18n/i18n.js";
import { ArchivePage } from "../ArchivePage.js";

function renderArchivePage(
  props: Partial<Parameters<typeof ArchivePage>[0]> = {},
): string {
  const i18n = createI18n("en");
  const c = {
    get(key: string) {
      if (key === "i18n") return i18n;
      return undefined;
    },
  } as unknown as Context;

  I18nProvider({ c, children: "" });

  return renderToString(
    ArchivePage({
      groups: [
        {
          year: "2026",
          month: "03",
          label: "March 2026",
          totalCount: 1,
          posts: [
            {
              id: "pst_01",
              permalink: "/post-1",
              slug: "post-1",
              title: "Test post",
              summary: "A post for tooltip interpolation.",
              format: "note",
              status: "published",
              visibility: "public",
              pinned: false,
              featured: false,
              publishedAt: "2026-03-30T12:00:00Z",
              publishedAtFormatted: "Mar 30, 2026",
              publishedAtTime: "20:00",
              publishedAtRelative: "Mar 30",
              updatedAt: "2026-03-30T12:00:00Z",
              media: [],
              collections: [],
              isLastInThread: true,
            },
          ],
        },
      ],
      totalCount: 1,
      currentPage: 1,
      totalPages: 1,
      filters: {},
      availableYears: [2026],
      availableCollections: [],
      isAuthenticated: false,
      timeZone: "UTC",
      ...props,
    }),
  );
}

describe("ArchivePage", () => {
  it("interpolates the published timestamp label for archive tiles", () => {
    const html = renderArchivePage();

    expect(html).toContain('title="Published on Mar 30, 2026 at 20:00"');
  });
});
