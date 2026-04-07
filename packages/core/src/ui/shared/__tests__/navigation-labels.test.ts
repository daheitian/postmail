import type { I18n, MessageDescriptor } from "@lingui/core";
import { describe, expect, it } from "vitest";
import {
  getNavItemDisplayLabel,
  getSystemNavDescription,
  getSystemNavDisplayLabel,
} from "../navigation-labels.js";

const i18n = {
  _(descriptor: MessageDescriptor) {
    return `translated:${descriptor.message}`;
  },
} satisfies Pick<I18n, "_">;

describe("getNavItemDisplayLabel", () => {
  it("translates the built-in latest system item", () => {
    expect(
      getNavItemDisplayLabel(
        {
          type: "system",
          systemKey: "latest",
          label: "Latest",
          url: "/latest",
        },
        i18n,
      ),
    ).toBe("translated:Latest");
  });

  it("translates the built-in featured system item", () => {
    expect(
      getNavItemDisplayLabel(
        {
          type: "system",
          systemKey: "featured",
          label: "Featured",
          url: "/featured",
        },
        i18n,
      ),
    ).toBe("translated:Featured");
  });

  it("translates the built-in collections system item", () => {
    expect(
      getNavItemDisplayLabel(
        {
          type: "system",
          systemKey: "collections",
          label: "Collections",
          url: "/collections",
        },
        i18n,
      ),
    ).toBe("translated:Collections");
  });

  it("translates prefixed public archive system items", () => {
    expect(
      getNavItemDisplayLabel(
        {
          type: "system",
          systemKey: "archive",
          label: "Archive",
          url: "/blog/archive",
        },
        i18n,
        "/blog",
      ),
    ).toBe("translated:Archive");
  });

  it("translates the built-in settings system item", () => {
    expect(
      getNavItemDisplayLabel(
        {
          type: "system",
          systemKey: "settings",
          label: "Settings",
          url: "/settings",
        },
        i18n,
      ),
    ).toBe("translated:Settings");
  });

  it("uses custom label for system item when label differs from default", () => {
    expect(
      getNavItemDisplayLabel(
        {
          type: "system",
          systemKey: "collections",
          label: "Topics",
          url: "/collections",
        },
        i18n,
      ),
    ).toBe("Topics");
  });

  it("translates RSS", () => {
    expect(
      getNavItemDisplayLabel(
        { type: "system", systemKey: "rss", label: "RSS", url: "/feed" },
        i18n,
      ),
    ).toBe("translated:RSS");
  });

  it("leaves custom links untouched", () => {
    expect(
      getNavItemDisplayLabel(
        { type: "link", label: "Collections", url: "/notes" },
        i18n,
      ),
    ).toBe("Collections");
  });

  it("does not translate matching custom links even if the path matches", () => {
    expect(
      getNavItemDisplayLabel(
        { type: "link", label: "Collections", url: "/collections" },
        i18n,
      ),
    ).toBe("Collections");
  });

  it("uses the stored label for collection nav items", () => {
    expect(
      getNavItemDisplayLabel(
        { type: "collection", label: "Design Notes", url: "/design-notes" },
        i18n,
      ),
    ).toBe("Design Notes");
  });
});

describe("system nav labels", () => {
  it("translates built-in system nav titles", () => {
    expect(getSystemNavDisplayLabel("latest", i18n)).toBe("translated:Latest");
    expect(getSystemNavDisplayLabel("featured", i18n)).toBe(
      "translated:Featured",
    );
    expect(getSystemNavDisplayLabel("collections", i18n)).toBe(
      "translated:Collections",
    );
    expect(getSystemNavDisplayLabel("archive", i18n)).toBe(
      "translated:Archive",
    );
    expect(getSystemNavDisplayLabel("rss", i18n)).toBe("translated:RSS");
  });

  it("translates system nav descriptions", () => {
    expect(getSystemNavDescription("latest", i18n)).toBe(
      "translated:Link to your latest posts. If it comes before Featured, the homepage opens here.",
    );
    expect(getSystemNavDescription("featured", i18n)).toBe(
      "translated:Link to your featured posts. If it comes before Latest, the homepage opens here.",
    );
    expect(getSystemNavDescription("archive", i18n)).toBe(
      "translated:Link to the post archive",
    );
    expect(getSystemNavDescription("rss", i18n)).toBe(
      "translated:Add a link to your main RSS feed. Change what /feed returns in General.",
    );
  });
});
