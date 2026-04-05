// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../toast.js", () => ({
  showToast: vi.fn(),
}));

import "../collection-form-bridge.js";

type CollectionFormHarness = HTMLElement & {
  cancelHref?: string;
  initial?: {
    slug?: string;
  };
  loading?: boolean;
};

function createPageForm(
  cancelHref = "/c",
  initial: CollectionFormHarness["initial"] = { slug: "books" },
): CollectionFormHarness {
  document.body.innerHTML = `
    <div
      data-collection-editor-page
      data-collection-editor-save-failed="Couldn't save. Try again in a moment."
    >
      <jant-collection-form></jant-collection-form>
    </div>
  `;

  const formEl = document.querySelector(
    "jant-collection-form",
  ) as CollectionFormHarness | null;

  if (!formEl) {
    throw new Error("Expected collection form element");
  }

  formEl.cancelHref = cancelHref;
  formEl.initial = initial;
  return formEl;
}

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("collection form bridge", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    window.location.href = "http://localhost/c/new";
  });

  it("redirects new collections back to the configured return URL", async () => {
    const formEl = createPageForm("/c");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ slug: "books" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    formEl.dispatchEvent(
      new CustomEvent("jant:collection-submit", {
        bubbles: true,
        detail: {
          endpoint: "/api/collections",
          isEdit: false,
          data: {
            title: "Books",
            slug: "books",
          },
        },
      }),
    );

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledWith("/api/collections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        title: "Books",
        slug: "books",
      }),
    });
    expect(window.location.pathname).toBe("/c");
  });

  it("redirects edited collections back to the collections page when launched from the list", async () => {
    const formEl = createPageForm("/c");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ slug: "books-renamed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    formEl.dispatchEvent(
      new CustomEvent("jant:collection-submit", {
        bubbles: true,
        detail: {
          endpoint: "/api/collections/collection-1",
          isEdit: true,
          data: {
            title: "Books renamed",
            slug: "books-renamed",
          },
        },
      }),
    );

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledWith("/api/collections/collection-1", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        title: "Books renamed",
        slug: "books-renamed",
      }),
    });
    expect(window.location.pathname).toBe("/c");
  });

  it("redirects edited collections back to the updated detail page when launched from detail", async () => {
    window.location.href =
      "http://localhost/c/books/edit?returnTo=%2Fc%2Fbooks";
    const formEl = createPageForm("/c/books");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ slug: "books-renamed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    formEl.dispatchEvent(
      new CustomEvent("jant:collection-submit", {
        bubbles: true,
        detail: {
          endpoint: "/api/collections/collection-1",
          isEdit: true,
          data: {
            title: "Books renamed",
            slug: "books-renamed",
          },
        },
      }),
    );

    await flushAsyncWork();

    expect(window.location.pathname).toBe("/c/books-renamed");
  });

  it("rewrites aggregate return paths when a collection slug changes", async () => {
    window.location.href =
      "http://localhost/c/books/edit?returnTo=%2Fc%2Fbooks%2Bessays";
    const formEl = createPageForm("/c/books+essays", { slug: "books" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ slug: "books-renamed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    formEl.dispatchEvent(
      new CustomEvent("jant:collection-submit", {
        bubbles: true,
        detail: {
          endpoint: "/api/collections/collection-1",
          isEdit: true,
          data: {
            title: "Books renamed",
            slug: "books-renamed",
          },
        },
      }),
    );

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledWith("/api/collections/collection-1", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        title: "Books renamed",
        slug: "books-renamed",
      }),
    });
    expect(window.location.pathname).toBe("/c/books-renamed+essays");
  });
});
