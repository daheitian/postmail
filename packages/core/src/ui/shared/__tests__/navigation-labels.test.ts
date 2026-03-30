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
  it("translates the built-in collections system item", () => {
    expect(
      getNavItemDisplayLabel(
        {
          type: "system",
          systemKey: "collections",
          label: "Collections",
          url: "/c",
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

  it("translates the built-in settings sign-in fallback", () => {
    expect(
      getNavItemDisplayLabel(
        {
          type: "system",
          systemKey: "settings",
          label: "Sign in",
          url: "/signin",
        },
        i18n,
      ),
    ).toBe("translated:Sign in");
  });

  it("leaves RSS untouched", () => {
    expect(
      getNavItemDisplayLabel(
        { type: "system", systemKey: "rss", label: "RSS", url: "/feed" },
        i18n,
      ),
    ).toBe("RSS");
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
        { type: "link", label: "Collections", url: "/c" },
        i18n,
      ),
    ).toBe("Collections");
  });
});

describe("system nav labels", () => {
  it("translates built-in system nav titles but keeps RSS raw", () => {
    expect(getSystemNavDisplayLabel("collections", i18n)).toBe(
      "translated:Collections",
    );
    expect(getSystemNavDisplayLabel("archive", i18n)).toBe(
      "translated:Archive",
    );
    expect(getSystemNavDisplayLabel("rss", i18n)).toBe("RSS");
  });

  it("translates system nav descriptions", () => {
    expect(getSystemNavDescription("archive", i18n)).toBe(
      "translated:Link to the post archive",
    );
    expect(getSystemNavDescription("rss", i18n)).toBe(
      "translated:Add a link to your main RSS feed. Change what /feed returns in General.",
    );
  });
});
