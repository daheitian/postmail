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
import "../jant-collection-directory.js";
import type { JantCollectionsManager } from "../jant-collection-directory.js";

const labels: CollectionManagerLabels = {
  collectionsTitle: "Collections",
  collectionSingular: "collection",
  collectionPlural: "collections",
  organize: "Organize",
  done: "Done",
  organizeHint: "Drag to reorder.",
  newDivider: "New divider",
  newLink: "New link",
  addLink: "Add link",
  addLinkDescription: "Add a custom shortcut.",
  dividerLabel: "Divider label",
  dividerLabelPlaceholder: "Section",
  newCollection: "New collection",
  edit: "Edit",
  label: "Label",
  url: "URL",
  linkLabelPlaceholder: "Quotes",
  linkUrlPlaceholder: "/archive?format=quote",
  labelAndUrlRequired: "Add a label and URL.",
  deleteDivider: "Delete divider",
  moreActions: "More actions",
  deleteCollection: "Delete collection",
  confirmDelete: "Delete this collection permanently?",
  deleteLink: "Remove link",
  confirmDeleteLink: "Remove this link from Collections?",
  cancel: "Cancel",
  entrySingular: "entry",
  entryPlural: "entries",
  emptyState: "Create a collection to get started.",
  orderSaved: "Collection order updated.",
  saved: "Collection saved.",
  linkCreated: "Link added.",
  linkSaved: "Link updated.",
  saveFailed: "Save failed.",
  deleted: "Collection deleted.",
  linkDeleted: "Link removed.",
  formLabels: {
    titleLabel: "Title",
    titlePlaceholder: "My Collection",
    slugLabel: "Collection link",
    slugInvalidHelp: "Use lowercase letters, numbers, and hyphens only.",
    slugReservedHelp: "This link is reserved. Choose something else.",
    slugHelp: "This is the last part of the collection link.",
    editSlugLabel: "Edit link",
    resetSlugLabel: "Reset link",
    quickHint: "More options are available after you create it.",
    quickSubmitLabel: "Done",
    createdLabel: "Collection created.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "What's this collection about?",
    sortOrderLabel: "Sort order",
    sortNewest: "Newest first",
    sortOldest: "Oldest first",
    sortRatingDesc: "Highest rated",
    submitLabel: "Save",
    cancelLabel: "Cancel",
  },
};

const items: CollectionManagerItem[] = [
  {
    id: "directory-1",
    type: "collection",
    collectionId: "collection-1",
    position: "a0",
    collection: {
      id: "collection-1",
      slug: "reading",
      title: "Reading",
      description: "Notes from books",
      sortOrder: "newest",
      postCount: 4,
      recentActivityAt: 1_763_619_200,
    },
  },
  {
    id: "directory-2",
    type: "collection",
    collectionId: "collection-2",
    position: "a1",
    collection: {
      id: "collection-2",
      slug: "tools",
      title: "Tools",
      description: "Tools I keep around",
      sortOrder: "newest",
      postCount: 2,
      recentActivityAt: 1_763_619_260,
    },
  },
];

const groupedItems: CollectionManagerItem[] = [
  {
    id: "divider-1",
    type: "divider",
    label: "Reading group",
    position: "a0",
  },
  ...items,
  {
    id: "divider-2",
    type: "divider",
    label: "Solo group",
    position: "a9",
  },
  {
    id: "directory-3",
    type: "collection",
    collectionId: "collection-3",
    position: "b0",
    collection: {
      id: "collection-3",
      slug: "solo",
      title: "Solo",
      description: null,
      sortOrder: "newest",
      postCount: 1,
      recentActivityAt: 1_763_619_300,
    },
  },
];

const itemsWithLink: CollectionManagerItem[] = [
  {
    id: "link-1",
    type: "link",
    label: "Quotes",
    url: "/archive?format=quote&visibility=public&view=list",
    position: "a0",
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

async function createElementWithItems(
  customItems: CollectionManagerItem[],
): Promise<JantCollectionsManager> {
  const el = document.createElement(
    "jant-collections-manager",
  ) as JantCollectionsManager;
  el.labels = labels;
  el.items = customItems;
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

  it("renders divider labels as aggregate links when followed by a grouped section", async () => {
    const el = await createElementWithItems(groupedItems);

    const links = el.querySelectorAll<HTMLAnchorElement>(
      ".collection-directory-divider-link",
    );

    expect(links).toHaveLength(1);
    expect(links[0]?.textContent?.trim()).toBe("Reading group");
    expect(links[0]?.getAttribute("href")).toBe("/c/reading+tools");
  });

  it("keeps focus on the URL field while typing in the new link form", async () => {
    const el = await createElement();

    el._showLinkForm = true;
    await el.updateComplete;

    const urlInput = el.querySelector<HTMLInputElement>(
      "#collections-new-link-url",
    );
    expect(urlInput).not.toBeNull();
    if (!urlInput) throw new Error("Expected new link URL input");

    urlInput.focus();
    urlInput.value = "/archive?format=quote";
    urlInput.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    expect(document.activeElement).toBe(urlInput);
  });

  it("does not show the raw URL in link rows", async () => {
    const el = await createElementWithItems(itemsWithLink);

    const linkRow = el.querySelector<HTMLAnchorElement>(
      ".collection-directory-item-link",
    );

    expect(linkRow).not.toBeNull();
    expect(linkRow?.textContent).toContain("Quotes");
    expect(linkRow?.textContent).toContain("Link");
    expect(linkRow?.textContent).not.toContain(
      "/archive?format=quote&visibility=public&view=list",
    );
  });
});
