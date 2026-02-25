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
  searchCollections: "Search...",
  noCollections: "No collections found.",
  post: "Post",
  addAlt: "+ ALT",
  addAltTitle: "Add alt text",
  altPlaceholder: "Describe this...",
  altHint: "Alt text improves accessibility",
  addMore: "Add",
  uploading: "Uploading...",
  published: "Published!",
};

const collections: ComposeCollection[] = [
  { id: 1, title: "Books", iconHtml: "" },
  { id: 2, title: "Movies", iconHtml: "<span>🎬</span>" },
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
    const detail = receivedDetail as unknown as ComposeSubmitDetail;
    expect(detail.format).toBe("note");
    expect(detail.body).toBe("Hello world");
    expect(detail.status).toBe("published");
    expect(detail.collectionIds).toEqual([]);
    expect(detail.mediaIds).toEqual([]);
    expect(detail.mediaAlts).toEqual({});
  });

  it("collection selector toggles IDs", async () => {
    const el = await createElement();

    // Open collection combobox
    const trigger = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-collection-trigger"),
      "expected collection trigger",
    );
    trigger.click();
    await el.updateComplete;

    const options = el.querySelectorAll<HTMLElement>(
      "[data-popover] [role='option']",
    );
    expect(options.length).toBe(2);

    // Select first collection
    options[0].click();
    await el.updateComplete;
    expect(el._collectionIds).toEqual([1]);

    // Select second collection
    options[1].click();
    await el.updateComplete;
    expect(el._collectionIds).toEqual([1, 2]);

    // Deselect first
    options[0].click();
    await el.updateComplete;
    expect(el._collectionIds).toEqual([2]);
  });

  it("reset restores initial state", async () => {
    const el = await createElement();
    el._format = "link";
    el._collectionIds = [1, 2];
    el._loading = true;

    el.reset();

    expect(el._format).toBe("note");
    expect(el._collectionIds).toEqual([]);
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
    const detail = receivedDetail as unknown as ComposeSubmitDetail;
    expect(detail.status).toBe("draft");
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

  it("no old media picker dialog is rendered", async () => {
    const el = await createElement();

    expect(el.querySelector("#compose-media-picker")).toBeNull();
    expect(el.querySelector(".compose-media-picker")).toBeNull();
  });

  it("editor renders attachments when present", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );

    // Simulate adding an attachment
    const blob = new Blob(["fake-image"], { type: "image/png" });
    const file = new File([blob], "test.png", { type: "image/png" });
    const previewUrl = URL.createObjectURL(blob);

    editor._attachments = [
      {
        clientId: "test-id-1",
        file,
        previewUrl,
        status: "done",
        mediaId: "media-1",
        alt: "",
        error: null,
      },
    ];
    await editor.updateComplete;

    // Thumbnail strip should be visible
    expect(editor.querySelector(".compose-attachments")).not.toBeNull();
    expect(editor.querySelector(".compose-attachment-thumb")).not.toBeNull();
    // ALT button should be visible
    expect(editor.querySelector(".compose-attachment-alt")).not.toBeNull();
    // Media tool button should show "Add" label
    const mediaBtn =
      editor.querySelector<HTMLButtonElement>(".compose-tool-btn");
    expect(mediaBtn?.querySelector(".compose-tool-tip")?.textContent).toBe(
      "Add",
    );

    URL.revokeObjectURL(previewUrl);
  });

  it("remove button clears attachment", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );

    const blob = new Blob(["fake-image"], { type: "image/png" });
    const file = new File([blob], "test.png", { type: "image/png" });
    const previewUrl = URL.createObjectURL(blob);

    editor._attachments = [
      {
        clientId: "test-id-1",
        file,
        previewUrl,
        status: "done",
        mediaId: "media-1",
        alt: "",
        error: null,
      },
    ];
    await editor.updateComplete;

    // Click remove button
    const removeBtn = requireElement(
      editor.querySelector<HTMLButtonElement>(".compose-attachment-remove"),
      "expected remove button",
    );
    removeBtn.click();
    await editor.updateComplete;

    // Attachment strip should be gone (no attachments)
    expect(editor.querySelector(".compose-attachments")).toBeNull();
    expect(editor._attachments.length).toBe(0);
  });

  it("alt panel opens and closes", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );

    const blob = new Blob(["fake-image"], { type: "image/png" });
    const file = new File([blob], "test.png", { type: "image/png" });
    const previewUrl = URL.createObjectURL(blob);

    editor._attachments = [
      {
        clientId: "test-id-1",
        file,
        previewUrl,
        status: "done",
        mediaId: "media-1",
        alt: "",
        error: null,
      },
    ];
    await editor.updateComplete;

    // Click ALT button
    const altBtn = requireElement(
      editor.querySelector<HTMLButtonElement>(".compose-attachment-alt"),
      "expected alt button",
    );
    altBtn.click();
    await editor.updateComplete;

    // Alt panel should be visible
    expect(editor.querySelector(".compose-alt-panel")).not.toBeNull();
    expect(editor._showAltPanel).toBe(true);

    // Click done to close
    const doneBtn = editor.querySelector<HTMLButtonElement>(
      ".compose-alt-panel .compose-post-btn",
    );
    doneBtn?.click();
    await editor.updateComplete;

    expect(editor._showAltPanel).toBe(false);
    expect(editor.querySelector(".compose-alt-panel")).toBeNull();

    URL.revokeObjectURL(previewUrl);
  });

  it("submit includes mediaIds and mediaAlts from completed attachments", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );

    const blob = new Blob(["fake-image"], { type: "image/png" });
    const file = new File([blob], "test.png", { type: "image/png" });
    const previewUrl = URL.createObjectURL(blob);

    editor._attachments = [
      {
        clientId: "test-id-1",
        file,
        previewUrl,
        status: "done",
        mediaId: "media-1",
        alt: "A test image",
        error: null,
      },
    ];
    editor._body = "Post with image";
    await editor.updateComplete;

    let receivedDetail: ComposeSubmitDetail | null = null;
    el.addEventListener("jant:compose-submit", (event) => {
      const customEvent = event as CustomEvent<ComposeSubmitDetail>;
      receivedDetail = customEvent.detail;
    });

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-post-btn"),
      "expected post button",
    ).click();

    expect(receivedDetail).not.toBeNull();
    const detail = receivedDetail as unknown as ComposeSubmitDetail;
    expect(detail.mediaIds).toEqual(["media-1"]);
    expect(detail.mediaAlts).toEqual({ "media-1": "A test image" });

    URL.revokeObjectURL(previewUrl);
  });

  it("dispatches deferred submit when uploads are pending", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );

    const blob = new Blob(["fake-image"], { type: "image/png" });
    const file = new File([blob], "test.png", { type: "image/png" });
    const previewUrl = URL.createObjectURL(blob);

    editor._attachments = [
      {
        clientId: "test-id-1",
        file,
        previewUrl,
        status: "uploading",
        mediaId: null,
        alt: "Alt for pending",
        error: null,
      },
    ];
    editor._body = "Post with pending upload";
    await editor.updateComplete;

    let deferredEvent: CustomEvent | null = null;
    el.addEventListener("jant:compose-submit-deferred", (event) => {
      deferredEvent = event as CustomEvent;
    });

    // Prevent dialog.close() from throwing (no parent dialog in test)
    let submitEvent: CustomEvent | null = null;
    el.addEventListener("jant:compose-submit", (event) => {
      submitEvent = event as CustomEvent;
    });

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-post-btn"),
      "expected post button",
    ).click();

    // Should have dispatched deferred, not regular submit
    expect(deferredEvent).not.toBeNull();
    expect(submitEvent).toBeNull();
    expect(
      (deferredEvent as unknown as CustomEvent).detail.pendingAttachments,
    ).toBeDefined();

    URL.revokeObjectURL(previewUrl);
  });
});
