// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

const { sortableCreateMock, sortableDestroyMock } = vi.hoisted(() => ({
  sortableCreateMock: vi.fn(),
  sortableDestroyMock: vi.fn(),
}));

vi.mock("sortablejs", () => ({
  default: {
    create: sortableCreateMock.mockImplementation(() => ({
      destroy: sortableDestroyMock,
    })),
  },
}));

import type {
  CollectionManagerItem,
  CollectionManagerLabels,
} from "../collection-manager-types.js";
import "../jant-collection-sidebar.js";
import type { JantCollectionsManager } from "../jant-collection-sidebar.js";

const labels: CollectionManagerLabels = {
  collectionsTitle: "Collections",
  collectionSingular: "collection",
  collectionPlural: "collections",
  organize: "Organize",
  done: "Done",
  organizeHint: "Drag to reorder.",
  newDivider: "New divider",
  dividerLabel: "Divider label",
  dividerLabelPlaceholder: "Section",
  newCollection: "New collection",
  edit: "Edit",
  deleteDivider: "Delete divider",
  moreActions: "More actions",
  deleteCollection: "Delete collection",
  confirmDelete: "Delete this collection permanently?",
  cancel: "Cancel",
  entrySingular: "entry",
  entryPlural: "entries",
  emptyState: "Create a collection to get started.",
  orderSaved: "Order saved.",
  saved: "Saved.",
  saveFailed: "Save failed.",
  deleted: "Deleted.",
  formLabels: {
    titleLabel: "Title",
    titlePlaceholder: "My Collection",
    slugLabel: "Slug",
    slugHelp: "URL-safe identifier",
    descriptionLabel: "Description",
    descriptionPlaceholder: "What's this collection about?",
    featuredIconsLabel: "Featured",
    browseAllIconsLabel: "Browse all icons",
    showMoreIcons: "Show more icons",
    showLessIcons: "Show less",
    removeIcon: "Remove",
    iconsTab: "Icons",
    emojisTab: "Emojis",
    searchIconsPlaceholder: "Search icons...",
    searchEmojisPlaceholder: "Search emojis...",
    sortOrderLabel: "Sort order",
    sortNewest: "Newest first",
    sortOldest: "Oldest first",
    sortRatingDesc: "Highest rated",
    sortRatingAsc: "Lowest rated",
    submitLabel: "Save",
    cancelLabel: "Cancel",
  },
};

const items: CollectionManagerItem[] = [
  {
    id: "sidebar-1",
    type: "collection",
    collectionId: "collection-1",
    position: "a0",
    collection: {
      id: "collection-1",
      slug: "reading",
      title: "Reading",
      description: "Notes from books",
      icon: "book-open",
      sortOrder: "newest",
      postCount: 4,
      recentActivityAt: 1_763_619_200,
    },
  },
  {
    id: "sidebar-2",
    type: "collection",
    collectionId: "collection-2",
    position: "a1",
    collection: {
      id: "collection-2",
      slug: "tools",
      title: "Tools",
      description: "Tools I keep around",
      icon: "hammer",
      sortOrder: "newest",
      postCount: 2,
      recentActivityAt: 1_763_619_260,
    },
  },
];

async function createElement(): Promise<JantCollectionsManager> {
  const el = document.createElement(
    "jant-collections-manager",
  ) as JantCollectionsManager;
  el.labels = labels;
  el.items = items;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

async function createElementWithManagerRoot(): Promise<JantCollectionsManager> {
  const root = document.createElement("div");
  root.setAttribute("data-collections-manager-root", "");
  root.innerHTML = `
    <p data-collections-count></p>
    <div data-collections-reorder-actions hidden>
      <button type="button" data-collections-action="divider">New divider</button>
      <button type="button" data-collections-action="done">Done</button>
    </div>
    <div data-collections-toolbar></div>
    <p data-collections-hint hidden></p>
    <div data-collections-more-menu hidden></div>
    <button type="button" data-collections-action="toggle-menu"></button>
  `;

  const el = document.createElement(
    "jant-collections-manager",
  ) as JantCollectionsManager;
  el.labels = labels;
  el.items = items;
  root.appendChild(el);
  document.body.appendChild(root);
  await el.updateComplete;
  return el;
}

async function createEmptyElementWithManagerRoot(): Promise<JantCollectionsManager> {
  const root = document.createElement("div");
  root.setAttribute("data-collections-manager-root", "");
  root.innerHTML = `
    <p data-collections-count hidden></p>
    <div data-collections-reorder-actions hidden>
      <button type="button" data-collections-action="divider">New divider</button>
      <button type="button" data-collections-action="done">Done</button>
    </div>
    <div data-collections-toolbar></div>
    <p data-collections-hint hidden></p>
    <div data-collections-more-menu hidden></div>
    <button type="button" data-collections-action="toggle-menu"></button>
  `;

  const el = document.createElement(
    "jant-collections-manager",
  ) as JantCollectionsManager;
  el.labels = labels;
  el.items = [];
  root.appendChild(el);
  document.body.appendChild(root);
  await el.updateComplete;
  return el;
}

describe("JantCollectionsManager", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    sortableCreateMock.mockClear();
    sortableDestroyMock.mockClear();
  });

  it("uses responsive sortable settings in reorder mode", async () => {
    const el = await createElement();

    el._reorderMode = true;
    await el.updateComplete;

    expect(sortableCreateMock).toHaveBeenCalledTimes(1);
    const [, options] = sortableCreateMock.mock.calls[0] ?? [];
    expect(options).toMatchObject({
      animation: 180,
      bubbleScroll: false,
      chosenClass: "collection-directory-chosen",
      dragClass: "collection-directory-drag",
      fallbackTolerance: 4,
      forceAutoScrollFallback: true,
      ghostClass: "collection-directory-ghost",
      handle: "[data-drag-handle]",
      scroll: true,
      scrollSensitivity: 56,
      scrollSpeed: 18,
    });
  });

  it("lets collection rows initiate drag from the main content area", async () => {
    const el = await createElement();

    el._reorderMode = true;
    await el.updateComplete;

    const dragSurface = el.querySelector(
      ".collection-directory-reorder-main[data-drag-handle]",
    );
    expect(dragSurface).not.toBeNull();
  });

  it("shows the reorder actions with new divider while organizing", async () => {
    const el = await createElementWithManagerRoot();
    const root = el.closest<HTMLElement>("[data-collections-manager-root]");

    expect(root).not.toBeNull();
    if (!root) throw new Error("Expected collections manager root");

    const reorderActions = root.querySelector<HTMLElement>(
      "[data-collections-reorder-actions]",
    );
    const toolbar = root.querySelector<HTMLElement>(
      "[data-collections-toolbar]",
    );
    const dividerButton = root.querySelector<HTMLButtonElement>(
      '[data-collections-reorder-actions] [data-collections-action="divider"]',
    );

    expect(reorderActions?.hidden).toBe(true);
    expect(toolbar?.hidden).toBe(false);
    expect(dividerButton?.textContent).toContain(labels.newDivider);

    el._reorderMode = true;
    await el.updateComplete;

    expect(reorderActions?.hidden).toBe(false);
    expect(toolbar?.hidden).toBe(true);
  });

  it("keeps the collection count visible when the list is empty", async () => {
    const el = await createEmptyElementWithManagerRoot();
    const root = el.closest<HTMLElement>("[data-collections-manager-root]");

    expect(root).not.toBeNull();
    if (!root) throw new Error("Expected collections manager root");

    const count = root.querySelector<HTMLElement>("[data-collections-count]");

    expect(count?.hidden).toBe(false);
    expect(count?.textContent).toBe("0 collections");
  });
});
