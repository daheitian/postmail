// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../lazy-slugify.js", () => ({
  slugify: (text: string) =>
    Promise.resolve(
      text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    ),
  preloadSlug: () => {},
}));

import type {
  CollectionFormInitial,
  CollectionFormLabels,
  CollectionSubmitDetail,
} from "../collection-types.js";
import "../jant-collection-form.js";
import type { JantCollectionForm } from "../jant-collection-form.js";
import {
  ALL_ICON_CATEGORIES,
  ALL_ICON_NAMES,
  ICON_CATALOG,
} from "../../../lib/icon-catalog.js";

const CURATED_ICON_NAMES = Object.values(ICON_CATALOG).flat();

const labels: CollectionFormLabels = {
  titleLabel: "Title",
  titlePlaceholder: "Placeholder Title",
  slugLabel: "Slug",
  slugHelp: "Help text",
  descriptionLabel: "Description",
  descriptionPlaceholder: "Placeholder Description",
  featuredIconsLabel: "Featured",
  browseAllIconsLabel: "Browse all icons",
  showMoreIcons: "Show more icons",
  showLessIcons: "Show less",
  removeIcon: "Remove",
  iconsTab: "Icons",
  emojisTab: "Emojis",
  searchIconsPlaceholder: "Search icons...",
  searchEmojisPlaceholder: "Search emojis...",
  sortOrderLabel: "Sort Order",
  sortNewest: "Newest first",
  sortOldest: "Oldest first",
  sortRatingDesc: "Highest rated",
  sortRatingAsc: "Lowest rated",
  submitLabel: "Create Collection",
  cancelLabel: "Cancel",
};

const initial: CollectionFormInitial = {
  title: "",
  slug: "",
  description: "",
  sortOrder: "newest",
  icon: "",
};

async function createElement(
  overrides: Partial<JantCollectionForm> = {},
): Promise<JantCollectionForm> {
  const el = document.createElement(
    "jant-collection-form",
  ) as JantCollectionForm;
  el.labels = labels;
  el.initial = initial;
  el.action = "/api/collections";
  el.cancelHref = "/api/collections";
  el.isEdit = false;
  Object.assign(el, overrides);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

async function openIconPicker(el: JantCollectionForm): Promise<void> {
  const trigger = el.querySelector<HTMLButtonElement>("[data-icon-trigger]");
  trigger?.click();
  await el.updateComplete;
}

describe("JantCollectionForm", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders form fields with labels", async () => {
    const el = await createElement();
    const inputs = el.querySelectorAll("input");
    expect(inputs.length).toBeGreaterThan(0);

    const titleLabel = el.querySelector(".field .label");
    expect(titleLabel?.textContent?.trim()).toBe("Title");

    const submitButton = el.querySelector<HTMLButtonElement>(
      "button[type=submit]",
    );
    expect(submitButton?.textContent?.trim()).toBe("Create Collection");
  });

  it("auto-generates slug when not editing", async () => {
    const el = await createElement();
    const titleInput = el.querySelectorAll<HTMLInputElement>("input")[0];
    const slugInput = el.querySelectorAll<HTMLInputElement>("input")[1];

    titleInput.value = "My Great Collection!";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    // slugify is async — flush the microtask then wait for Lit re-render
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;

    expect(slugInput.value).toBe("my-great-collection");
  });

  it("does not overwrite slug when editing", async () => {
    const el = await createElement({
      isEdit: true,
      initial: {
        ...initial,
        title: "Existing",
        slug: "existing-slug",
      },
    });
    await el.updateComplete;

    const titleInput = el.querySelectorAll<HTMLInputElement>("input")[0];
    const slugInput = el.querySelectorAll<HTMLInputElement>("input")[1];

    titleInput.value = "Updated Title";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    expect(slugInput.value).toBe("existing-slug");
  });

  it("dispatches jant:collection-submit on submit", async () => {
    const el = await createElement();

    const titleInput = el.querySelectorAll<HTMLInputElement>("input")[0];
    const slugInput = el.querySelectorAll<HTMLInputElement>("input")[1];
    const descriptionTextarea =
      el.querySelector<HTMLTextAreaElement>("textarea");
    const select = el.querySelector<HTMLSelectElement>("select");

    titleInput.value = "Books";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    slugInput.value = "books";
    slugInput.dispatchEvent(new Event("input", { bubbles: true }));
    if (descriptionTextarea) {
      descriptionTextarea.value = "All about books";
      descriptionTextarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (select) {
      select.value = "rating_desc";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    let detail: CollectionSubmitDetail | null = null;
    el.addEventListener("jant:collection-submit", (event) => {
      const customEvent = event as CustomEvent<CollectionSubmitDetail>;
      detail = customEvent.detail;
    });

    const form = el.querySelector("form");
    form?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    expect(detail).not.toBeNull();
    const d = detail as unknown as CollectionSubmitDetail;
    expect(d.endpoint).toBe("/api/collections");
    expect(d.data.title).toBe("Books");
    expect(d.data.slug).toBe("books");
    expect(d.data.description).toBe("All about books");
    expect(d.data.sortOrder).toBe("rating_desc");
    // Default icon is auto-selected in create mode using the first semantic palette entry.
    expect(d.data.icon).toBeDefined();
    expect(d.data.icon).toContain('"name":"library"');
    expect(d.data.icon).toContain('"palette":"stone"');
  });

  it("shows the curated icon catalog by default", async () => {
    const el = await createElement();

    await openIconPicker(el);

    const iconButtons = el.querySelectorAll<HTMLButtonElement>(
      "[data-icon-picker] button[data-icon-name]",
    );
    const curatedCount = Object.values(ICON_CATALOG).reduce(
      (count, icons) => count + icons.length,
      0,
    );

    expect(iconButtons).toHaveLength(curatedCount);
    expect(
      el.querySelector("[data-icon-picker] button[data-icon-show-more]"),
    ).not.toBeNull();
    expect(
      el.querySelector('[data-icon-picker] button[data-icon-name="library"]'),
    ).not.toBeNull();
    expect(
      el.querySelector(
        '[data-icon-picker] button[data-icon-name="alarm-clock"]',
      ),
    ).toBeNull();
  });

  it("falls back to the default icon after removing an existing icon", async () => {
    const el = await createElement({
      isEdit: true,
      initial: {
        ...initial,
        title: "Movies",
        slug: "movies",
        icon: "🎬",
      },
    });

    await openIconPicker(el);

    const removeButton = el.querySelector<HTMLButtonElement>(
      "[data-icon-picker] button[data-icon-remove]",
    );
    removeButton?.click();
    await el.updateComplete;

    let detail: CollectionSubmitDetail | null = null;
    el.addEventListener("jant:collection-submit", (event) => {
      const customEvent = event as CustomEvent<CollectionSubmitDetail>;
      detail = customEvent.detail;
    });

    el.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    expect(detail).not.toBeNull();
    const d = detail as unknown as CollectionSubmitDetail;
    expect(d.data.icon).toContain('"name":"library"');
    expect(d.data.icon).toContain('"palette":"stone"');
  });

  it("expands into category browsing and collapses back to featured", async () => {
    const el = await createElement();

    await openIconPicker(el);

    const showMoreButton = el.querySelector<HTMLButtonElement>(
      "[data-icon-picker] button[data-icon-show-more]",
    );
    showMoreButton?.click();
    await el.updateComplete;

    const firstCategory = Object.keys(ALL_ICON_CATEGORIES)[0];
    expect(firstCategory).toBeDefined();
    expect(
      el
        .querySelector<HTMLButtonElement>(
          `[data-icon-picker] button[data-icon-browse-category="${firstCategory}"]`,
        )
        ?.getAttribute("aria-pressed"),
    ).toBe("true");

    const targetEntry = Object.entries(ALL_ICON_CATEGORIES).find(
      ([category, icons]) =>
        category !== firstCategory &&
        icons.some((name) => !CURATED_ICON_NAMES.includes(name)),
    );
    expect(targetEntry).toBeDefined();
    const [targetCategory, targetIcons] = targetEntry as [string, string[]];
    const targetIconName = targetIcons.find(
      (name) => !CURATED_ICON_NAMES.includes(name),
    );
    const visibleTargetIcons = targetIcons.filter((name) =>
      ALL_ICON_NAMES.includes(name),
    );
    expect(targetIconName).toBeDefined();

    const categoryButton = el.querySelector<HTMLButtonElement>(
      `[data-icon-picker] button[data-icon-browse-category="${targetCategory}"]`,
    );
    categoryButton?.click();
    await el.updateComplete;

    const renderedButtons = el.querySelectorAll<HTMLButtonElement>(
      "[data-icon-picker] button[data-icon-name]",
    );
    expect(renderedButtons).toHaveLength(visibleTargetIcons.length);
    expect(
      el.querySelector(
        `[data-icon-picker] button[data-icon-name="${targetIconName as string}"]`,
      ),
    ).not.toBeNull();

    const showLessButton = el.querySelector<HTMLButtonElement>(
      "[data-icon-picker] button[data-icon-show-less]",
    );
    showLessButton?.click();
    await el.updateComplete;

    expect(
      el.querySelector("[data-icon-picker] button[data-icon-show-more]"),
    ).not.toBeNull();
    expect(
      el.querySelector(
        `[data-icon-picker] [data-category="${targetCategory}"]`,
      ),
    ).toBeNull();
  });

  it("searches the full icon set but caps rendered results", async () => {
    const el = await createElement();

    await openIconPicker(el);

    const searchTerm = ["a", "e", "i", "-"].find((term) => {
      return ALL_ICON_NAMES.filter((name) => name.includes(term)).length > 120;
    });
    expect(searchTerm).toBeDefined();
    const rawMatches = ALL_ICON_NAMES.filter((name) =>
      name.includes(searchTerm as string),
    );
    expect(rawMatches.length).toBeGreaterThan(120);
    const visibleMatches = rawMatches.slice(0, 120);
    const nonCuratedVisibleMatch = visibleMatches.find(
      (name) => !CURATED_ICON_NAMES.includes(name),
    );
    expect(nonCuratedVisibleMatch).toBeDefined();

    const searchInput = el.querySelector<HTMLInputElement>(
      '[data-icon-picker] input[type="search"]',
    );
    if (!searchInput) {
      throw new Error("Expected icon search input to render");
    }
    searchInput.value = searchTerm as string;
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    const iconButtons = el.querySelectorAll<HTMLButtonElement>(
      "[data-icon-picker] button[data-icon-name]",
    );

    expect(iconButtons).toHaveLength(120);
    expect(
      el.querySelector(
        `[data-icon-picker] button[data-icon-name="${nonCuratedVisibleMatch as string}"]`,
      ),
    ).not.toBeNull();
  });
});
