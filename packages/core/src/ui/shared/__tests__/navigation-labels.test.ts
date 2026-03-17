import type { MessageDescriptor } from "@lingui/core";
import { describe, expect, it } from "vitest";
import {
  getNavItemDisplayLabel,
  getSystemNavDescription,
  getSystemNavDisplayLabel,
} from "../navigation-labels.js";

const translate = (descriptor: MessageDescriptor) =>
  `translated:${descriptor.message}`;

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
        translate,
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
        translate,
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
        translate,
      ),
    ).toBe("translated:Sign in");
  });

  it("leaves RSS untouched", () => {
    expect(
      getNavItemDisplayLabel(
        { type: "system", systemKey: "rss", label: "RSS", url: "/feed" },
        translate,
      ),
    ).toBe("RSS");
  });

  it("leaves custom links untouched", () => {
    expect(
      getNavItemDisplayLabel(
        { type: "link", label: "Collections", url: "/notes" },
        translate,
      ),
    ).toBe("Collections");
  });

  it("does not translate matching custom links even if the path matches", () => {
    expect(
      getNavItemDisplayLabel(
        { type: "link", label: "Collections", url: "/c" },
        translate,
      ),
    ).toBe("Collections");
  });
});

describe("system nav labels", () => {
  it("translates built-in system nav titles but keeps RSS raw", () => {
    expect(getSystemNavDisplayLabel("collections", translate)).toBe(
      "translated:Collections",
    );
    expect(getSystemNavDisplayLabel("archive", translate)).toBe(
      "translated:Archive",
    );
    expect(getSystemNavDisplayLabel("rss", translate)).toBe("RSS");
  });

  it("translates system nav descriptions", () => {
    expect(getSystemNavDescription("archive", translate)).toBe(
      "translated:Link to the post archive",
    );
  });
});
