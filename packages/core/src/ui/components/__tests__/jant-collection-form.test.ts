// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from "vitest";
import type {
  CollectionFormInitial,
  CollectionFormLabels,
  CollectionSubmitDetail,
} from "../collection-types.js";
import "../jant-collection-form.js";
import type { JantCollectionForm } from "../jant-collection-form.js";

const labels: CollectionFormLabels = {
  titleLabel: "Title",
  titlePlaceholder: "Placeholder Title",
  slugLabel: "Slug",
  slugHelp: "Help text",
  descriptionLabel: "Description",
  descriptionPlaceholder: "Placeholder Description",
  iconLabel: "Icon",
  chooseIcon: "Choose Icon",
  removeIcon: "Remove",
  dialogTitle: "Choose Icon",
  dialogClose: "Close",
  searchIconsPlaceholder: "Search icons...",
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
    expect(d.data.icon).toBeUndefined();
  });
});
