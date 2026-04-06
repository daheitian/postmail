// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

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
import {
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_SLUG_LENGTH,
  MAX_COLLECTION_TITLE_LENGTH,
} from "../../../types.js";
import "../jant-collection-form.js";
import type { JantCollectionForm } from "../jant-collection-form.js";

const labels: CollectionFormLabels = {
  titleLabel: "Title",
  titlePlaceholder: "Placeholder Title",
  slugLabel: "Collection link",
  slugHelp: "Help text",
  slugInvalidHelp: "Use lowercase letters, numbers, and hyphens only.",
  slugReservedHelp: "This link is reserved. Choose something else.",
  slugTooLongHelp: "Keep this link under 200 characters.",
  editSlugLabel: "Edit link",
  resetSlugLabel: "Reset link",
  quickHint: "More options are available after you create it.",
  quickSubmitLabel: "Done",
  createdLabel: "Collection created.",
  descriptionLabel: "Description",
  descriptionPlaceholder: "Placeholder Description",
  sortOrderLabel: "Sort Order",
  sortNewest: "Newest first",
  sortOldest: "Oldest first",
  sortRatingDesc: "Highest rated",
  submitLabel: "Create Collection",
  cancelLabel: "Cancel",
};

const initial: CollectionFormInitial = {
  title: "",
  slug: "",
  description: "",
  sortOrder: "newest",
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

async function flushSlugify(el: JantCollectionForm) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

describe("JantCollectionForm", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the core form fields", async () => {
    const el = await createElement();
    const select = el.querySelector("select") as HTMLSelectElement | null;
    const titleInput = el.querySelector<HTMLInputElement>(
      "[data-collection-title-input]",
    );
    const slugInput = el.querySelector<HTMLInputElement>(
      "[data-collection-slug-input]",
    );
    const descriptionTextarea =
      el.querySelector<HTMLTextAreaElement>("textarea");

    expect(titleInput).not.toBeNull();
    expect(slugInput).not.toBeNull();
    expect(descriptionTextarea).not.toBeNull();
    if (!select || !titleInput || !slugInput || !descriptionTextarea) {
      throw new Error("Expected sort order select");
    }

    expect(titleInput.maxLength).toBe(MAX_COLLECTION_TITLE_LENGTH);
    expect(slugInput.maxLength).toBe(MAX_COLLECTION_SLUG_LENGTH);
    expect(descriptionTextarea.maxLength).toBe(
      MAX_COLLECTION_DESCRIPTION_LENGTH,
    );
    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      "newest",
      "oldest",
      "rating_desc",
    ]);
    expect(
      el.querySelector<HTMLButtonElement>("button[type=submit]")?.textContent,
    ).toContain("Create Collection");
  });

  it("auto-generates a slug when creating", async () => {
    const el = await createElement();
    const titleInput = el.querySelector<HTMLInputElement>(
      "[data-collection-title-input]",
    );
    const slugInput = el.querySelector<HTMLInputElement>(
      "[data-collection-slug-input]",
    );

    if (!titleInput || !slugInput) {
      throw new Error("Expected title and slug inputs");
    }

    titleInput.value = "My Great Collection!";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    await flushSlugify(el);

    expect(slugInput.value).toBe("my-great-collection");
  });

  it("truncates auto-generated slugs to the configured maximum length", async () => {
    const el = await createElement();
    const titleInput = el.querySelector<HTMLInputElement>(
      "[data-collection-title-input]",
    );
    const slugInput = el.querySelector<HTMLInputElement>(
      "[data-collection-slug-input]",
    );

    if (!titleInput || !slugInput) {
      throw new Error("Expected title and slug inputs");
    }

    titleInput.value = "alpha ".repeat(30).trim();
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    await flushSlugify(el);

    expect(slugInput.value.length).toBeLessThanOrEqual(
      MAX_COLLECTION_SLUG_LENGTH,
    );
    expect(slugInput.value.endsWith("-")).toBe(false);
  });

  it("enforces the configured title maximum length in the rendered form", async () => {
    const el = await createElement();
    const titleInput = el.querySelector<HTMLInputElement>(
      "[data-collection-title-input]",
    );

    if (!titleInput) {
      throw new Error("Expected title input");
    }

    expect(titleInput.maxLength).toBe(MAX_COLLECTION_TITLE_LENGTH);
  });

  it("does not overwrite an existing slug while editing", async () => {
    const el = await createElement({
      isEdit: true,
      initial: {
        ...initial,
        title: "Existing",
        slug: "existing-slug",
      },
    });
    await el.updateComplete;

    const titleInput = el.querySelector<HTMLInputElement>(
      "[data-collection-title-input]",
    );
    const slugInput = el.querySelector<HTMLInputElement>(
      "[data-collection-slug-input]",
    );

    if (!titleInput || !slugInput) {
      throw new Error("Expected title and slug inputs");
    }

    titleInput.value = "Updated Title";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    await flushSlugify(el);

    expect(slugInput.value).toBe("existing-slug");
  });

  it("dispatches submit detail for the full form", async () => {
    const el = await createElement();
    const titleInput = el.querySelector<HTMLInputElement>(
      "[data-collection-title-input]",
    );
    const slugInput = el.querySelector<HTMLInputElement>(
      "[data-collection-slug-input]",
    );
    const descriptionTextarea =
      el.querySelector<HTMLTextAreaElement>("textarea");
    const select = el.querySelector("select") as HTMLSelectElement | null;

    if (!titleInput || !slugInput || !descriptionTextarea || !select) {
      throw new Error("Expected full form inputs");
    }

    titleInput.value = "Books";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    slugInput.value = "books";
    slugInput.dispatchEvent(new Event("input", { bubbles: true }));
    descriptionTextarea.value = "All about books";
    descriptionTextarea.dispatchEvent(new Event("input", { bubbles: true }));
    select.value = "rating_desc";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    let submittedData: CollectionSubmitDetail["data"] | null = null;
    el.addEventListener("jant:collection-submit", (event) => {
      submittedData = (event as CustomEvent<CollectionSubmitDetail>).detail
        .data;
    });

    el.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    expect(submittedData).toEqual({
      title: "Books",
      slug: "books",
      description: "All about books",
      sortOrder: "rating_desc",
    });
  });

  it("submits the form from the description textarea on Cmd/Ctrl+Enter", async () => {
    const el = await createElement();
    const titleInput = el.querySelector<HTMLInputElement>(
      "[data-collection-title-input]",
    );
    const slugInput = el.querySelector<HTMLInputElement>(
      "[data-collection-slug-input]",
    );
    const descriptionTextarea =
      el.querySelector<HTMLTextAreaElement>("textarea");

    if (!titleInput || !slugInput || !descriptionTextarea) {
      throw new Error("Expected full form inputs");
    }

    titleInput.value = "Wisdom";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    slugInput.value = "wisdom";
    slugInput.dispatchEvent(new Event("input", { bubbles: true }));
    descriptionTextarea.value = "Short notes worth keeping.";
    descriptionTextarea.dispatchEvent(new Event("input", { bubbles: true }));

    let submittedData: CollectionSubmitDetail["data"] | null = null;
    el.addEventListener("jant:collection-submit", (event) => {
      submittedData = (event as CustomEvent<CollectionSubmitDetail>).detail
        .data;
    });

    descriptionTextarea.dispatchEvent(
      new globalThis.KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(submittedData).toEqual({
      title: "Wisdom",
      slug: "wisdom",
      description: "Short notes worth keeping.",
      sortOrder: "newest",
    });
  });

  it("does not submit the form from the description textarea on plain Enter", async () => {
    const el = await createElement();
    const titleInput = el.querySelector<HTMLInputElement>(
      "[data-collection-title-input]",
    );
    const slugInput = el.querySelector<HTMLInputElement>(
      "[data-collection-slug-input]",
    );
    const descriptionTextarea =
      el.querySelector<HTMLTextAreaElement>("textarea");

    if (!titleInput || !slugInput || !descriptionTextarea) {
      throw new Error("Expected full form inputs");
    }

    titleInput.value = "Wisdom";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    slugInput.value = "wisdom";
    slugInput.dispatchEvent(new Event("input", { bubbles: true }));

    let detail: CollectionSubmitDetail | null = null;
    el.addEventListener("jant:collection-submit", (event) => {
      detail = (event as CustomEvent<CollectionSubmitDetail>).detail;
    });

    descriptionTextarea.dispatchEvent(
      new globalThis.KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(detail).toBeNull();
  });

  it("shows a slug error and blocks submit when the slug is invalid", async () => {
    const el = await createElement();
    const titleInput = el.querySelector<HTMLInputElement>(
      "[data-collection-title-input]",
    );
    const slugInput = el.querySelector<HTMLInputElement>(
      "[data-collection-slug-input]",
    );

    if (!titleInput || !slugInput) {
      throw new Error("Expected title and slug inputs");
    }

    titleInput.value = "Books";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    slugInput.value = "books/2025";
    slugInput.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    let detail: CollectionSubmitDetail | null = null;
    el.addEventListener("jant:collection-submit", (event) => {
      detail = (event as CustomEvent<CollectionSubmitDetail>).detail;
    });

    el.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await el.updateComplete;

    expect(detail).toBeNull();
    expect(
      el.querySelector("[data-collection-slug-error]")?.textContent?.trim(),
    ).toBe(labels.slugInvalidHelp);
  });

  it("uses the quick variant without rendering extra fields", async () => {
    const el = await createElement({ variant: "quick" });

    expect(el.querySelector("textarea")).toBeNull();
    expect(el.querySelector("select")).toBeNull();
    expect(el.querySelector("[data-collection-slug-input]")).toBeNull();

    const titleInput = el.querySelector<HTMLInputElement>(
      "[data-collection-title-input]",
    );
    if (!titleInput) {
      throw new Error("Expected title input");
    }

    titleInput.value = "Reading Notes";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    await flushSlugify(el);

    let detail: CollectionSubmitDetail | null = null;
    el.addEventListener("jant:collection-submit", (event) => {
      detail = (event as CustomEvent<CollectionSubmitDetail>).detail;
    });

    el.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    expect(detail).not.toBeNull();
    expect((detail as unknown as CollectionSubmitDetail).data).toEqual({
      title: "Reading Notes",
      slug: "reading-notes",
    });
  });
});
