// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from "vitest";
import type {
  ComposeLabels,
  ComposeCollection,
  ComposeSubmitDetail,
} from "../compose-types.js";
import "../jant-compose-editor.js";
import "../jant-compose-dialog.js";
import type { JantComposeDialog } from "../jant-compose-dialog.js";
import type { JantComposeEditor } from "../jant-compose-editor.js";

function requireElement<T extends globalThis.Element>(
  element: T | null,
  message: string,
): T {
  if (!element) {
    throw new Error(message);
  }
  return element;
}

const labels: ComposeLabels = {
  cancel: "Cancel",
  note: "Note",
  link: "Link",
  quote: "Quote",
  saveDraft: "Save as Draft",
  saveAsDraft: "Save as draft",
  discard: "Discard",
  titlePlaceholder: "Title",
  bodyPlaceholder: "What's on your mind...",
  urlPlaceholder: "Paste a URL...",
  linkTitlePlaceholder: "Give it a title...",
  thoughtsPlaceholder: "Your thoughts (optional)",
  quotePlaceholder: "Type the quote...",
  authorPlaceholder: "Author (optional)",
  sourcePlaceholder: "Source link (optional)",
  attachedText: "Attached Text",
  attachedTextPlaceholder: "Paste text...",
  attachedTextHint: "Supplementary content",
  done: "Done",
  media: "Media",
  score: "Score",
  title: "Title",
  collection: "Collection",
  post: "Post",
  selectMedia: "Select Media",
  loading: "Loading...",
};

const collections: ComposeCollection[] = [
  { id: 1, title: "Books", icon: null },
  { id: 2, title: "Movies", icon: "\u{1F3AC}" },
];

async function createElement(
  cols: ComposeCollection[] = collections,
): Promise<JantComposeDialog> {
  const el = document.createElement("jant-compose-dialog") as JantComposeDialog;
  el.collections = cols;
  el.labels = labels;
  document.body.appendChild(el);
  await el.updateComplete;
  // Wait for nested editor to also render
  const editor = el.querySelector<JantComposeEditor>("jant-compose-editor");
  if (editor) await editor.updateComplete;
  return el;
}

describe("JantComposeDialog", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders with collections and labels", async () => {
    const el = await createElement();

    // Header present
    expect(el.querySelector(".compose-dialog-header")).not.toBeNull();

    // Format buttons present
    const segmentedItems = el.querySelectorAll(".compose-segmented-item");
    expect(segmentedItems.length).toBe(3);
    expect(segmentedItems[0].textContent?.trim()).toBe("Note");
    expect(segmentedItems[1].textContent?.trim()).toBe("Link");
    expect(segmentedItems[2].textContent?.trim()).toBe("Quote");

    // Post button present
    const postBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-post-btn"),
      "expected post button",
    );
    expect(postBtn.textContent?.trim()).toBe("Post");
  });

  it("format switching updates active state", async () => {
    const el = await createElement();

    // Note is active by default
    const noteBtn = el.querySelectorAll<HTMLButtonElement>(
      ".compose-segmented-item",
    )[0];
    expect(noteBtn.classList.contains("compose-segmented-item-active")).toBe(
      true,
    );

    // Click link
    const linkBtn = el.querySelectorAll<HTMLButtonElement>(
      ".compose-segmented-item",
    )[1];
    linkBtn.click();
    await el.updateComplete;

    expect(el._format).toBe("link");
    expect(linkBtn.classList.contains("compose-segmented-item-active")).toBe(
      true,
    );
    expect(noteBtn.classList.contains("compose-segmented-item-active")).toBe(
      false,
    );
  });

  it("submit dispatches jant:compose-submit with correct payload", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._body = "Hello world";
    await editor.updateComplete;

    let receivedDetail: ComposeSubmitDetail | null = null;
    el.addEventListener("jant:compose-submit", (event) => {
      const customEvent = event as CustomEvent<ComposeSubmitDetail>;
      receivedDetail = customEvent.detail;
    });

    // Click post button
    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-post-btn"),
      "expected post button",
    ).click();

    expect(receivedDetail).not.toBeNull();
    if (!receivedDetail) return;
    expect(receivedDetail.format).toBe("note");
    expect(receivedDetail.body).toBe("Hello world");
    expect(receivedDetail.status).toBe("published");
    expect(receivedDetail.collectionIds).toEqual([]);
    expect(receivedDetail.mediaIds).toEqual([]);
  });

  it("collection selector toggles IDs", async () => {
    const el = await createElement();

    // Open collection dropdown
    const trigger = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-collection-trigger"),
      "expected collection trigger",
    );
    trigger.click();
    await el.updateComplete;

    const collectionItems = el.querySelectorAll<HTMLButtonElement>(
      ".compose-dropdown-above .compose-dropdown-item",
    );
    expect(collectionItems.length).toBe(2);

    // Select first collection
    collectionItems[0].click();
    await el.updateComplete;
    expect(el._collectionIds).toEqual([1]);

    // Select second collection
    collectionItems[1].click();
    await el.updateComplete;
    expect(el._collectionIds).toEqual([1, 2]);

    // Deselect first
    collectionItems[0].click();
    await el.updateComplete;
    expect(el._collectionIds).toEqual([2]);
  });

  it("reset restores initial state", async () => {
    const el = await createElement();
    el._format = "link";
    el._collectionIds = [1, 2];
    el._mediaIds = ["abc"];
    el._loading = true;

    el.reset();

    expect(el._format).toBe("note");
    expect(el._collectionIds).toEqual([]);
    expect(el._mediaIds).toEqual([]);
    expect(el._loading).toBe(false);
  });

  it("loading state disables submit button", async () => {
    const el = await createElement();
    el._loading = true;
    await el.updateComplete;

    const postBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-post-btn"),
      "expected post button",
    );
    expect(postBtn.disabled).toBe(true);
  });

  it("renders without collections", async () => {
    const el = await createElement([]);

    // No collection trigger
    expect(el.querySelector(".compose-collection-trigger")).toBeNull();
    // Spacer div present instead
    const actionRow = el.querySelector(".compose-action-row");
    expect(actionRow).not.toBeNull();
  });

  it("draft button dispatches submit with draft status", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._body = "Draft content";
    await editor.updateComplete;

    let receivedDetail: ComposeSubmitDetail | null = null;
    el.addEventListener("jant:compose-submit", (event) => {
      const customEvent = event as CustomEvent<ComposeSubmitDetail>;
      receivedDetail = customEvent.detail;
    });

    // Click the draft header button
    const draftBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-dialog-header-btn"),
      "expected draft button",
    );
    draftBtn.click();

    expect(receivedDetail).not.toBeNull();
    if (!receivedDetail) return;
    expect(receivedDetail.status).toBe("draft");
  });

  it("does not dispatch submit when loading", async () => {
    const el = await createElement();
    el._loading = true;
    await el.updateComplete;

    let dispatched = false;
    el.addEventListener("jant:compose-submit", () => {
      dispatched = true;
    });

    const postBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-post-btn"),
      "expected post button",
    );
    postBtn.click();

    expect(dispatched).toBe(false);
  });

  it("loading state shows spinner in submit button", async () => {
    const el = await createElement();
    el._loading = true;
    await el.updateComplete;

    const spinner = el.querySelector(".compose-post-btn .animate-spin");
    expect(spinner).not.toBeNull();
  });
});
