// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../toast.js", () => ({
  showToast: vi.fn(),
}));

function createMarkup() {
  document.body.innerHTML = `
    <div id="toast-container"></div>
    <div
      data-collection-page-actions
      data-collection-id="collection-1"
      data-collection-page-labels='{"edit":"Edit","moreActions":"More actions","deleteCollection":"Delete","confirmDelete":"Delete this collection permanently? Posts inside won\\u0027t be removed.","saved":"Saved","saveFailed":"Couldn\\u0027t save. Try again in a moment.","deleted":"Deleted"}'
      data-collection-page-redirect-url="/c"
    >
      <button
        type="button"
        data-collection-page-action="toggle-menu"
        aria-expanded="false"
      >
        More actions
      </button>
      <div data-collection-page-menu hidden>
        <button type="button" role="menuitem" data-collection-page-action="edit">
          Edit
        </button>
        <button
          type="button"
          role="menuitem"
          data-collection-page-action="delete"
        >
          Delete
        </button>
      </div>
      <dialog data-collection-page-dialog>
        <input data-collection-title-input />
        <jant-collection-form></jant-collection-form>
      </dialog>
    </div>
  `;
}

describe("collection detail page actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    window.location.href = "http://localhost/c/original-slug";

    Object.defineProperty(HTMLDialogElement.prototype, "open", {
      configurable: true,
      get(this: HTMLDialogElement) {
        return this.hasAttribute("open");
      },
      set(this: HTMLDialogElement, value: boolean) {
        if (value) {
          this.setAttribute("open", "");
        } else {
          this.removeAttribute("open");
        }
      },
    });

    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true;
      },
    });

    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = false;
      },
    });
  });

  it("opens the edit dialog and updates the collection", async () => {
    createMarkup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ slug: "updated-slug" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { showToast } = await import("../toast.js");
    await import("../collection-page-actions.js");

    const trigger = document.querySelector<HTMLElement>(
      "[data-collection-page-action='toggle-menu']",
    );
    const editButton = document.querySelector<HTMLElement>(
      "[data-collection-page-action='edit']",
    );
    const dialog = document.querySelector<HTMLDialogElement>(
      "[data-collection-page-dialog]",
    );
    const form = document.querySelector("jant-collection-form");

    trigger?.click();
    editButton?.click();
    expect(dialog?.hasAttribute("open")).toBe(true);

    form?.dispatchEvent(
      new CustomEvent("jant:collection-submit", {
        bubbles: true,
        detail: {
          endpoint: "/api/collections/collection-1",
          isEdit: true,
          data: {
            title: "Updated",
            slug: "updated-slug",
          },
        },
      }),
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith("/api/collections/collection-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated",
        slug: "updated-slug",
      }),
    });
    expect(showToast).toHaveBeenCalledWith("Saved");
    expect(dialog?.hasAttribute("open")).toBe(false);
    expect(window.location.pathname).toBe("/c/updated-slug");
  });

  it("deletes the collection and redirects back to the collections page", async () => {
    createMarkup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });

    const { showToast } = await import("../toast.js");
    await import("../collection-page-actions.js");

    const trigger = document.querySelector<HTMLElement>(
      "[data-collection-page-action='toggle-menu']",
    );
    const deleteButton = document.querySelector<HTMLElement>(
      "[data-collection-page-action='delete']",
    );

    trigger?.click();
    deleteButton?.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(window.confirm).toHaveBeenCalledWith(
      "Delete this collection permanently? Posts inside won't be removed.",
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/collections/collection-1", {
      method: "DELETE",
    });
    expect(showToast).toHaveBeenCalledWith("Deleted");
    expect(window.location.pathname).toBe("/c");
  });
});
