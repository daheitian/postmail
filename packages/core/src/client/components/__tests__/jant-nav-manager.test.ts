// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

const { sortableCreateMock, sortableDestroyMock, showConfirmDialogMock } =
  vi.hoisted(() => ({
    sortableCreateMock: vi.fn(),
    sortableDestroyMock: vi.fn(),
    showConfirmDialogMock: vi.fn(),
  }));

vi.mock("sortablejs", () => ({
  default: {
    create: sortableCreateMock.mockImplementation(() => ({
      destroy: sortableDestroyMock,
    })),
  },
}));

vi.mock("../confirm.js", () => ({
  showConfirmDialog: showConfirmDialogMock,
}));

import type { NavManagerItem, NavManagerLabels } from "../nav-manager-types.js";
import "../jant-nav-manager.js";
import type { JantNavManager } from "../jant-nav-manager.js";

const labels: NavManagerLabels = {
  preview: "Preview",
  navigationItems: "Navigation items",
  emptyState: "Add a link to get started.",
  link: "Link",
  system: "System",
  toggleEdit: "Toggle edit",
  label: "Label",
  url: "URL",
  save: "Save",
  delete: "Delete",
  remove: "Remove",
  confirmDeleteLink: "Delete this navigation link?",
  orderSaved: "Navigation order updated.",
  labelRequired: "Add a label.",
  saveFailed: "Save failed.",
  deleteFailed: "Delete failed.",
  systemLinks: "System links",
  systemLinksDescription: "Built-in links.",
  addCustomLinkToNavigation: "Add a custom link",
  addLink: "Add link",
  addLinkDescription: "Add a custom nav link.",
  urlPlaceholder: "/about",
  labelAndUrlRequired: "Add a label and URL.",
  headerSection: "Header",
  moreSection: "More",
  moreEmptyHint: "Move links here to hide them under More.",
  placementSaved: "Navigation placement updated.",
  cancel: "Cancel",
};

const items: NavManagerItem[] = [
  {
    id: "nav-1",
    type: "link",
    label: "About",
    url: "/about",
    placement: "header",
  },
  {
    id: "nav-2",
    type: "link",
    label: "Links",
    url: "/links",
    placement: "header",
  },
  {
    id: "nav-3",
    type: "link",
    label: "Archive",
    url: "/archive",
    placement: "more",
  },
];

function requireElement<T>(value: T | null, message: string): T {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function getListIds(list: HTMLElement): string[] {
  return Array.from(list.querySelectorAll<HTMLElement>("[data-nav-id]")).map(
    (item) => item.dataset.navId ?? "",
  );
}

function getPreviewHeaderLabels(el: HTMLElement): string[] {
  return Array.from(
    el.querySelectorAll<HTMLElement>(
      ".nav-preview .site-header-nav > .site-header-link",
    ),
  ).map((item) => item.textContent?.trim() ?? "");
}

function getPreviewMoreLabels(el: HTMLElement): string[] {
  return Array.from(
    el.querySelectorAll<HTMLElement>(
      ".nav-preview .site-header-more-popover .site-header-more-link",
    ),
  ).map((item) => item.textContent?.trim() ?? "");
}

function getSortableOptions(
  listId: string,
): Record<string, ((event: unknown) => void) | undefined> {
  const call = sortableCreateMock.mock.calls.find(
    ([el]) => (el as HTMLElement).id === listId,
  );
  if (!call) {
    throw new Error(`Expected Sortable to be created for ${listId}`);
  }

  const [, options] = call;
  return options as Record<string, ((event: unknown) => void) | undefined>;
}

async function createElement(): Promise<JantNavManager> {
  const el = document.createElement("jant-nav-manager") as JantNavManager;
  el.labels = labels;
  el.items = items;
  el.systemNavItems = [];
  el.siteName = "Test Site";
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe("JantNavManager", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    sortableCreateMock.mockClear();
    sortableDestroyMock.mockClear();
    showConfirmDialogMock.mockReset();
    showConfirmDialogMock.mockResolvedValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      }),
    );
  });

  it("reconciles a cross-list drag after Sortable mutates the DOM", async () => {
    const el = await createElement();
    const headerList = requireElement(
      el.querySelector<HTMLElement>("#nav-items-header"),
      "expected header nav list",
    );
    const moreList = requireElement(
      el.querySelector<HTMLElement>("#nav-items-more"),
      "expected more nav list",
    );
    const movedItem = requireElement(
      headerList.querySelector<HTMLElement>('[data-nav-id="nav-2"]'),
      "expected moved nav item",
    );
    const headerSortable = getSortableOptions("nav-items-header");

    headerSortable.onStart?.({
      from: headerList,
      to: headerList,
      item: movedItem,
      oldIndex: 1,
      newIndex: 1,
    });

    moreList.insertBefore(movedItem, moreList.firstChild);

    headerSortable.onEnd?.({
      from: headerList,
      to: moreList,
      item: movedItem,
      oldIndex: 1,
      newIndex: 0,
    });

    await el.updateComplete;
    await Promise.resolve();
    await Promise.resolve();

    expect(getListIds(headerList)).toEqual(["nav-1"]);
    expect(getListIds(moreList)).toEqual(["nav-2", "nav-3"]);
    expect(getPreviewHeaderLabels(el)).toEqual(["About"]);
    expect(getPreviewMoreLabels(el)).toEqual(["Links", "Archive"]);
    expect(
      Array.from(el.querySelectorAll<HTMLElement>("[data-nav-id]")).map(
        (item) => item.dataset.navId,
      ),
    ).toEqual(["nav-1", "nav-2", "nav-3"]);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/nav-items/nav-2",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ placement: "more" }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/nav-items/nav-2/move",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          after: null,
          before: "nav-3",
        }),
      }),
    );
  });

  it("opens and dismisses the preview More popover", async () => {
    const el = await createElement();
    const trigger = requireElement(
      el.querySelector<HTMLElement>("[data-preview-more-trigger]"),
      "expected preview more trigger",
    );
    const popover = requireElement(
      el.querySelector<HTMLElement>(".nav-preview .site-header-more-popover"),
      "expected preview more popover",
    );

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(popover.getAttribute("aria-hidden")).toBe("true");

    trigger.click();
    await el.updateComplete;

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(popover.getAttribute("aria-hidden")).toBe("false");
    expect(getPreviewMoreLabels(el)).toEqual(["Archive"]);

    const escapeEvent = new Event("keydown");
    Object.defineProperty(escapeEvent, "key", { value: "Escape" });
    document.dispatchEvent(escapeEvent);
    await el.updateComplete;

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(popover.getAttribute("aria-hidden")).toBe("true");
  });

  it("confirms before dispatching nav deletion", async () => {
    const el = await createElement();
    const deleteHandler = vi.fn();
    el.addEventListener("jant:nav-delete", deleteHandler);

    const toggle = requireElement(
      el.querySelector<HTMLButtonElement>(".nav-item-toggle"),
      "expected nav item toggle",
    );
    toggle.click();
    await el.updateComplete;

    const deleteButton = Array.from(el.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Delete",
    );
    deleteButton?.click();
    await Promise.resolve();

    expect(showConfirmDialogMock).toHaveBeenCalledWith({
      message: "Delete this navigation link?",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    expect(deleteHandler).toHaveBeenCalledTimes(1);
    expect(deleteHandler.mock.calls[0]?.[0]).toMatchObject({
      detail: { id: "nav-1" },
    });
  });

  it("does not dispatch nav deletion when confirmation is canceled", async () => {
    showConfirmDialogMock.mockResolvedValue(false);
    const el = await createElement();
    const deleteHandler = vi.fn();
    el.addEventListener("jant:nav-delete", deleteHandler);

    const toggle = requireElement(
      el.querySelector<HTMLButtonElement>(".nav-item-toggle"),
      "expected nav item toggle",
    );
    toggle.click();
    await el.updateComplete;

    const deleteButton = Array.from(el.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Delete",
    );
    deleteButton?.click();
    await Promise.resolve();

    expect(deleteHandler).not.toHaveBeenCalled();
  });
});
