// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi } from "vitest";
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
  rate: "Rate",
  emoji: "Emoji",
  title: "Title",
  fullscreen: "Fullscreen",
  collection: "Collection",
  searchCollections: "Search...",
  noCollections: "No collections found.",
  emptyCollections: "Create a collection to get started.",
  post: "Post",
  addAlt: "+ ALT",
  addAltTitle: "Add alt text",
  altPlaceholder: "Describe this...",
  altHint: "Alt text improves accessibility",
  addMore: "Add",
  uploading: "Uploading...",
  published: "Published!",
  view: "View",
  retryAll: "Tap to retry",
  editPost: "Edit post",
  update: "Done",
  confirmCloseTitle: "Save to drafts?",
  confirmCloseSubtitle: "Save to drafts to edit and post at a later time.",
  confirmCloseSave: "Save",
  confirmCloseCancel: "Cancel",
  confirmCloseDiscard: "Don't save",
  confirmEditTitle: "You have unsaved changes",
  confirmEditSubtitle: "Do you want to publish your changes or discard them?",
  confirmEditPublish: "Publish",
  confirmEditDiscard: "Discard",
  discardChangesConfirm: "Discard changes?",
  drafts: "Drafts",
  draftsEmpty: "No drafts yet. Save a draft to find it here.",
  deleteDraft: "Delete Draft",
  draftDeleted: "Draft deleted.",
  publishFailedDraft: "Couldn't publish. Saved as draft.",
  uploadFailedDraft: "Some uploads failed. Saved as draft.",
  addCollection: "Add Collection",
  collectionCountLabel: "%name% + %count% more",
  draftRestored: "Draft restored.",
  reply: "Reply",
  publishFeatured: "Post as Featured",
  publishUnlisted: "Post Unlisted",
  publishPrivate: "Post as Private",
  publishSettings: "Publish settings",
  publishVisibilityLabel: "Visibility",
  publishVisibilityPublic: "Public",
  publishVisibilityPublicHint: "Shows up in the public timeline and /feed/all.",
  publishVisibilityUnlisted: "Unlisted",
  publishVisibilityUnlistedHint:
    "Hidden from public lists and feeds, but anyone with the link can still view it.",
  publishVisibilityPrivate: "Private",
  publishVisibilityPrivateHint: "Only visible when signed in.",
  publishFeaturedLabel: "Featured",
  publishFeaturedHint: "Also appears in Featured and the main RSS /feed.",
  publishSlugLabel: "Custom link",
  publishSlugPlaceholder: "your-post-link",
  publishSlugHint: "Leave blank to generate one automatically.",
  publishSlugAuto: "Generate automatically",
  publishSlugInvalid: "Use lowercase letters, numbers, and hyphens only.",
  publishSlugReserved: "This link is reserved. Choose something else.",
  postUnlisted: "Post unlisted",
  postPrivately: "Post privately",
  showMore: "Show more",
  showLess: "Show less",
  collectionFormLabels: {
    titleLabel: "Title",
    titlePlaceholder: "My Collection",
    slugLabel: "Collection link",
    slugHelp: "This is the last part of the collection link.",
    slugInvalidHelp: "Use lowercase letters, numbers, and hyphens only.",
    slugReservedHelp: "This link is reserved. Choose something else.",
    editSlugLabel: "Edit link",
    resetSlugLabel: "Reset link",
    quickHint: "More options are available after you create it.",
    quickSubmitLabel: "Done",
    createdLabel: "Collection created.",
    descriptionLabel: "Description (optional)",
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
    sortOrderLabel: "Sort Order",
    sortNewest: "Newest first",
    sortOldest: "Oldest first",
    sortRatingDesc: "Highest rated",
    sortRatingAsc: "Lowest rated",
    submitLabel: "Save",
    cancelLabel: "Cancel",
  },
};

const collections: ComposeCollection[] = [
  { id: "col-1", title: "Books", iconHtml: "" },
  { id: "col-2", title: "Movies", iconHtml: "<span>🎬</span>" },
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

    // Post button present (split button with visibility dropdown)
    const postBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-main"),
      "expected post button",
    );
    expect(postBtn.textContent?.trim()).toBe("Post");
    expect(postBtn.disabled).toBe(true);
    expect(
      requireElement(
        el.querySelector<HTMLButtonElement>(".compose-publish-toggle"),
        "expected publish settings toggle",
      ).disabled,
    ).toBe(false);
    expect(
      el.querySelector<HTMLButtonElement>(
        '.compose-tool-btn-view[aria-label="Fullscreen"]',
      ),
    ).not.toBeNull();
  });

  it("opens publish settings even when publish is disabled", async () => {
    const el = await createElement();

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-toggle"),
      "expected publish settings toggle",
    ).click();
    await el.updateComplete;

    expect(el.querySelector(".compose-publish-panel")).not.toBeNull();
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

  it("submit dispatches jant:compose-submit-deferred with correct payload", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello world" }] },
      ],
    };
    await editor.updateComplete;

    let receivedDetail:
      | (ComposeSubmitDetail & { pendingAttachments: unknown[] })
      | null = null;
    el.addEventListener("jant:compose-submit-deferred", (event) => {
      const customEvent = event as CustomEvent<
        ComposeSubmitDetail & { pendingAttachments: unknown[] }
      >;
      receivedDetail = customEvent.detail;
    });

    // Click post button
    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-main"),
      "expected post button",
    ).click();

    expect(receivedDetail).not.toBeNull();
    const detail = receivedDetail as unknown as ComposeSubmitDetail & {
      pendingAttachments: unknown[];
    };
    expect(detail.format).toBe("note");
    expect(detail.body).toContain("Hello world");
    expect(detail.status).toBe("published");
    expect(detail.visibility).toBe("public");
    expect(detail.collectionIds).toEqual([]);
    expect(detail.mediaIds).toEqual([]);
    expect(detail.mediaAlts).toEqual({});
    expect(detail.pendingAttachments).toEqual([]);
  });

  it("includes publish settings in the submit payload", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Configured post" }],
        },
      ],
    };
    await editor.updateComplete;

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-toggle"),
      "expected publish settings toggle",
    ).click();
    await el.updateComplete;

    const options = el.querySelectorAll<HTMLButtonElement>(
      ".compose-publish-option[role='radio']",
    );
    expect(options).toHaveLength(3);
    options[1]?.click();
    await el.updateComplete;

    expect(
      requireElement(
        el.querySelector<HTMLButtonElement>(".compose-publish-main"),
        "expected publish button",
      ).textContent?.trim(),
    ).toBe("Post unlisted");

    let receivedDetail: ComposeSubmitDetail | null = null;
    el.addEventListener("jant:compose-submit-deferred", (event) => {
      receivedDetail = (event as CustomEvent<ComposeSubmitDetail>).detail;
    });

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-main"),
      "expected publish button",
    ).click();

    expect(receivedDetail).not.toBeNull();
    expect((receivedDetail as ComposeSubmitDetail).visibility).toBe("unlisted");
    expect((receivedDetail as ComposeSubmitDetail).slug).toBeUndefined();
  });

  it("updates the publish button label for private visibility", async () => {
    const el = await createElement();

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-toggle"),
      "expected publish settings toggle",
    ).click();
    await el.updateComplete;

    const options = el.querySelectorAll<HTMLButtonElement>(
      ".compose-publish-option[role='radio']",
    );
    expect(options).toHaveLength(3);
    options[2]?.click();
    await el.updateComplete;

    expect(
      requireElement(
        el.querySelector<HTMLButtonElement>(".compose-publish-main"),
        "expected publish button",
      ).textContent?.trim(),
    ).toBe("Post privately");
  });

  it("includes a custom slug from the more menu in the submit payload", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Configured post" }],
        },
      ],
    };
    await editor.updateComplete;

    const moreBtn = requireElement(
      el.querySelectorAll<HTMLButtonElement>(".compose-dialog-header-btn")[1] ??
        null,
      "expected more button",
    );
    moreBtn.click();
    await el.updateComplete;

    const slugToggle = Array.from(
      el.querySelectorAll<HTMLButtonElement>(".compose-dropdown-item"),
    ).find((button) => button.textContent?.includes("Custom link"));
    requireElement(slugToggle ?? null, "expected custom link toggle").click();
    await el.updateComplete;

    const slugInput = requireElement(
      el.querySelector<HTMLInputElement>(".compose-more-slug-input"),
      "expected custom link input",
    );
    slugInput.value = "custom-link";
    slugInput.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    let receivedDetail: ComposeSubmitDetail | null = null;
    el.addEventListener("jant:compose-submit-deferred", (event) => {
      receivedDetail = (event as CustomEvent<ComposeSubmitDetail>).detail;
    });

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-main"),
      "expected publish button",
    ).click();

    expect(receivedDetail).not.toBeNull();
    expect((receivedDetail as ComposeSubmitDetail).slug).toBe("custom-link");
  });

  it("reopens the more menu with custom link expanded when a slug exists", async () => {
    const el = await createElement();

    const moreBtn = requireElement(
      el.querySelectorAll<HTMLButtonElement>(".compose-dialog-header-btn")[1] ??
        null,
      "expected more button",
    );

    moreBtn.click();
    await el.updateComplete;

    requireElement(
      Array.from(
        el.querySelectorAll<HTMLButtonElement>(".compose-dropdown-item"),
      ).find((button) => button.textContent?.includes("Custom link")) ?? null,
      "expected custom link toggle",
    ).click();
    await el.updateComplete;

    const slugInput = requireElement(
      el.querySelector<HTMLInputElement>(".compose-more-slug-input"),
      "expected custom link input",
    );
    slugInput.value = "reading-notes";
    slugInput.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    moreBtn.click();
    await el.updateComplete;
    moreBtn.click();
    await el.updateComplete;

    expect(el.querySelector(".compose-more-slug-input")).not.toBeNull();
  });

  it("shows a slug error and blocks publish when the custom link is invalid", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello world" }] },
      ],
    };
    await editor.updateComplete;

    const moreBtn = requireElement(
      el.querySelectorAll<HTMLButtonElement>(".compose-dialog-header-btn")[1] ??
        null,
      "expected more button",
    );
    moreBtn.click();
    await el.updateComplete;

    requireElement(
      Array.from(
        el.querySelectorAll<HTMLButtonElement>(".compose-dropdown-item"),
      ).find((button) => button.textContent?.includes("Custom link")) ?? null,
      "expected custom link toggle",
    ).click();
    await el.updateComplete;

    const slugInput = requireElement(
      el.querySelector<HTMLInputElement>(".compose-more-slug-input"),
      "expected custom link input",
    );
    slugInput.value = "bad/slug";
    slugInput.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    expect(
      requireElement(
        el.querySelector<HTMLButtonElement>(".compose-publish-main"),
        "expected publish button",
      ).disabled,
    ).toBe(true);
    expect(
      el.querySelector("[data-compose-slug-error]")?.textContent?.trim(),
    ).toBe("Use lowercase letters, numbers, and hyphens only.");

    let receivedDetail: ComposeSubmitDetail | null = null;
    el.addEventListener("jant:compose-submit-deferred", (event) => {
      receivedDetail = (event as CustomEvent<ComposeSubmitDetail>).detail;
    });

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-main"),
      "expected publish button",
    ).click();

    expect(receivedDetail).toBeNull();
  });

  it("includes the thread root id when replying", async () => {
    const el = await createElement();
    await el.openReply(
      "019ce8ce-d6d8-7fda-a5df-c2da2bef5ade",
      {
        contentHtml: "<p>Parent</p>",
        dateText: "Mar 14",
      },
      "019ce8cf-19a1-7d16-9a75-017a9ac7299d",
      {
        kind: "timeline-item",
        id: "019ce8cf-19a1-7d16-9a75-017a9ac7299d",
      },
    );

    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Reply body" }] },
      ],
    };
    await editor.updateComplete;
    await el.updateComplete;

    let receivedDetail:
      | (ComposeSubmitDetail & { pendingAttachments: unknown[] })
      | null = null;
    el.addEventListener("jant:compose-submit-deferred", (event) => {
      const customEvent = event as CustomEvent<
        ComposeSubmitDetail & { pendingAttachments: unknown[] }
      >;
      receivedDetail = customEvent.detail;
    });

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-single"),
      "expected reply button",
    ).click();

    expect(receivedDetail).not.toBeNull();
    const detail = receivedDetail as unknown as ComposeSubmitDetail & {
      pendingAttachments: unknown[];
    };
    expect(detail.replyToId).toBe("019ce8ce-d6d8-7fda-a5df-c2da2bef5ade");
    expect(detail.replyThreadRootId).toBe(
      "019ce8cf-19a1-7d16-9a75-017a9ac7299d",
    );
    expect(detail.replyRefreshKind).toBe("timeline-item");
    expect(detail.replyRefreshId).toBe("019ce8cf-19a1-7d16-9a75-017a9ac7299d");
  });

  it("omits visibility from locked edit submissions", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );

    el._editPostId = "post-123";
    el._visibilityLocked = true;
    el._slug = "reply-note";
    editor._bodyJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Edited reply" }],
        },
      ],
    };
    await editor.updateComplete;
    await el.updateComplete;

    let receivedDetail: ComposeSubmitDetail | null = null;
    el.addEventListener("jant:compose-submit-deferred", (event) => {
      receivedDetail = (event as CustomEvent<ComposeSubmitDetail>).detail;
    });

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-single"),
      "expected publish button",
    ).click();

    expect(receivedDetail).not.toBeNull();
    expect((receivedDetail as ComposeSubmitDetail).visibility).toBeUndefined();
    expect((receivedDetail as ComposeSubmitDetail).slug).toBe("reply-note");
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
    expect(el._collectionIds).toEqual(["col-1"]);

    // Select second collection
    options[1].click();
    await el.updateComplete;
    expect(el._collectionIds).toEqual(["col-1", "col-2"]);

    // Deselect first
    options[0].click();
    await el.updateComplete;
    expect(el._collectionIds).toEqual(["col-2"]);
  });

  it("reset restores initial state", async () => {
    const el = await createElement();
    el._format = "link";
    el._collectionIds = ["col-1", "col-2"];
    el._loading = true;
    el._draftSourceId = "abc123";

    el.reset();

    expect(el._format).toBe("note");
    expect(el._collectionIds).toEqual([]);
    expect(el._loading).toBe(false);
    expect(el._draftSourceId).toBeNull();
  });

  it("loading state disables submit button", async () => {
    const el = await createElement();
    el._loading = true;
    await el.updateComplete;

    const postBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-main"),
      "expected post button",
    );
    expect(postBtn.disabled).toBe(true);
  });

  it("renders collection selector even without collections", async () => {
    const el = await createElement([]);

    // Collection trigger is still shown so users can create new collections
    expect(el.querySelector(".compose-collection-trigger")).not.toBeNull();
    const actionRow = el.querySelector(".compose-action-row");
    expect(actionRow).not.toBeNull();
  });

  it("opens a quick collection dialog from the collection selector", async () => {
    const el = await createElement();
    const trigger = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-collection-trigger"),
      "expected collection trigger",
    );

    trigger.click();
    await el.updateComplete;

    const addAction = requireElement(
      el.querySelector<HTMLElement>(".compose-collection-add-action"),
      "expected add collection action",
    );
    addAction.click();
    await el.updateComplete;

    expect(el.querySelector("[data-collection-quick-dialog]")).not.toBeNull();
    expect(
      el.querySelector("[data-collection-quick-dialog] textarea"),
    ).toBeNull();
    expect(
      el.querySelector("[data-collection-quick-dialog] select"),
    ).toBeNull();
    expect(
      el.querySelector("[data-collection-quick-dialog] [data-icon-trigger]"),
    ).toBeNull();
    expect(
      el.querySelector(
        "[data-collection-quick-dialog] [data-collection-slug-input]",
      ),
    ).toBeNull();
    expect(
      el.querySelector(
        "[data-collection-quick-dialog] .collection-quick-dialog-cancel",
      )?.textContent,
    ).toContain("Cancel");
    expect(
      el.querySelector(
        "[data-collection-quick-dialog] .collection-quick-dialog-submit",
      )?.textContent,
    ).toContain("Done");
    expect(el.textContent).toContain(
      "More options are available after you create it.",
    );
  });

  it("draft button with content shows confirm panel", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Draft content" }],
        },
      ],
    };
    await editor.updateComplete;

    // Click the draft header button — should show confirm panel
    const draftBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-dialog-header-btn"),
      "expected draft button",
    );
    draftBtn.click();
    await el.updateComplete;

    expect(el._confirmPanelOpen).toBe(true);
    expect(el.querySelector(".compose-confirm-panel")).not.toBeNull();
  });

  it("draft button without content opens drafts panel", async () => {
    const el = await createElement();

    // Mock fetch for drafts list
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ posts: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    // Click the draft header button — should open drafts panel
    const draftBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-dialog-header-btn"),
      "expected draft button",
    );
    draftBtn.click();
    await el.updateComplete;

    expect(el._draftsPanelOpen).toBe(true);

    // Wait for fetch to resolve
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;

    expect(el._draftsLoading).toBe(false);
    expect(el.querySelector(".compose-drafts-panel")).not.toBeNull();

    fetchSpy.mockRestore();
  });

  it("does not dispatch submit when loading", async () => {
    const el = await createElement();
    el._loading = true;
    await el.updateComplete;

    let dispatched = false;
    el.addEventListener("jant:compose-submit-deferred", () => {
      dispatched = true;
    });

    const postBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-main"),
      "expected post button",
    );
    postBtn.click();

    expect(dispatched).toBe(false);
  });

  it("loading state shows spinner in submit button", async () => {
    const el = await createElement();
    el._loading = true;
    await el.updateComplete;

    const spinner = el.querySelector(".compose-publish-main .animate-spin");
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
        progress: null,
        mediaId: "media-1",
        alt: "",
        error: null,
        summary: null,
        chars: null,
      },
    ];
    editor._attachmentOrder = ["test-id-1"];
    await editor.updateComplete;

    // Thumbnail strip should be visible
    expect(editor.querySelector(".compose-attachments")).not.toBeNull();
    expect(editor.querySelector(".compose-attachment-thumb")).not.toBeNull();
    // ALT button should be visible
    expect(editor.querySelector(".compose-attachment-alt")).not.toBeNull();
    // Media tool button should show inline "Add" label
    const mediaBtn =
      editor.querySelector<HTMLButtonElement>(".compose-tool-btn");
    expect(mediaBtn?.querySelector(".compose-tool-label")?.textContent).toBe(
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
        progress: null,
        mediaId: "media-1",
        alt: "",
        error: null,
        summary: null,
        chars: null,
      },
    ];
    editor._attachmentOrder = ["test-id-1"];
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
        progress: null,
        mediaId: "media-1",
        alt: "",
        error: null,
        summary: null,
        chars: null,
      },
    ];
    editor._attachmentOrder = ["test-id-1"];
    await editor.updateComplete;

    // Click ALT button
    const altBtn = requireElement(
      editor.querySelector<HTMLButtonElement>(".compose-attachment-alt"),
      "expected alt button",
    );
    altBtn.click();
    await editor.updateComplete;
    await el.updateComplete;

    // Alt panel should be visible in the dialog (covers entire dialog)
    expect(el.querySelector(".compose-alt-panel")).not.toBeNull();
    expect(editor._showAltPanel).toBe(true);

    // Click done to close
    const doneBtn = el.querySelector<HTMLButtonElement>(
      ".compose-alt-panel .compose-post-btn",
    );
    doneBtn?.click();
    await el.updateComplete;

    expect(editor._showAltPanel).toBe(true); // Editor still tracks its own state
    expect(el.querySelector(".compose-alt-panel")).toBeNull();

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
        progress: null,
        mediaId: "media-1",
        alt: "A test image",
        error: null,
        summary: null,
        chars: null,
      },
    ];
    editor._bodyJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Post with image" }],
        },
      ],
    };
    await editor.updateComplete;

    let receivedDetail:
      | (ComposeSubmitDetail & { pendingAttachments: unknown[] })
      | null = null;
    el.addEventListener("jant:compose-submit-deferred", (event) => {
      const customEvent = event as CustomEvent<
        ComposeSubmitDetail & { pendingAttachments: unknown[] }
      >;
      receivedDetail = customEvent.detail;
    });

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-main"),
      "expected post button",
    ).click();

    expect(receivedDetail).not.toBeNull();
    const detail = receivedDetail as unknown as ComposeSubmitDetail & {
      pendingAttachments: unknown[];
    };
    expect(detail.mediaIds).toEqual(["media-1"]);
    expect(detail.mediaAlts).toEqual({ "media-1": "A test image" });
    expect(detail.pendingAttachments).toEqual([]);

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
        progress: null,
        mediaId: null,
        alt: "Alt for pending",
        error: null,
        summary: null,
        chars: null,
      },
    ];
    editor._bodyJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Post with pending upload" }],
        },
      ],
    };
    await editor.updateComplete;

    let deferredEvent: CustomEvent | null = null;
    el.addEventListener("jant:compose-submit-deferred", (event) => {
      deferredEvent = event as CustomEvent;
    });

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-main"),
      "expected post button",
    ).click();

    expect(deferredEvent).not.toBeNull();
    expect(
      (deferredEvent as unknown as CustomEvent).detail.pendingAttachments,
    ).toHaveLength(1);

    URL.revokeObjectURL(previewUrl);
  });

  // ── Close confirmation ─────────────────────────────────────────────

  it("requestClose on empty form closes immediately without confirmation", async () => {
    const el = await createElement();

    // Ensure no confirmation panel appears
    el.requestClose();
    await el.updateComplete;

    expect(el._confirmPanelOpen).toBe(false);
    expect(el.querySelector(".compose-confirm-panel")).toBeNull();
  });

  it("beforeunload does not warn when dialog was only opened", async () => {
    const el = await createElement();
    vi.spyOn(el, "closest").mockReturnValue({
      open: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLDialogElement);

    const event = new Event("beforeunload", {
      cancelable: true,
    }) as globalThis.BeforeUnloadEvent;

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(
      (
        el as unknown as { _hasUnsavedChanges: () => boolean }
      )._hasUnsavedChanges(),
    ).toBe(false);
  });

  it("beforeunload warns after compose content changes", async () => {
    const el = await createElement();
    vi.spyOn(el, "closest").mockReturnValue({
      open: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLDialogElement);
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );

    editor._bodyJson = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Unsaved" }] },
      ],
    };
    await editor.updateComplete;

    const event = new Event("beforeunload", {
      cancelable: true,
    }) as globalThis.BeforeUnloadEvent;

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("requestClose with content shows confirmation panel", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Some text" }] },
      ],
    };
    await editor.updateComplete;

    el.requestClose();
    await el.updateComplete;

    expect(el._confirmPanelOpen).toBe(true);
    expect(el.querySelector(".compose-confirm-panel")).not.toBeNull();
    expect(
      el.querySelector(".compose-confirm-title")?.textContent?.trim(),
    ).toBe("Save to drafts?");
  });

  it("confirm save draft dispatches submit-deferred with draft status", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Draft me" }] },
      ],
    };
    await editor.updateComplete;

    el.requestClose();
    await el.updateComplete;

    let receivedDetail: ComposeSubmitDetail | null = null;
    el.addEventListener("jant:compose-submit-deferred", (event) => {
      receivedDetail = (event as CustomEvent<ComposeSubmitDetail>).detail;
    });

    const saveBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-confirm-save"),
      "expected save draft button",
    );
    saveBtn.click();
    await el.updateComplete;

    expect(receivedDetail).not.toBeNull();
    expect((receivedDetail as unknown as ComposeSubmitDetail).status).toBe(
      "draft",
    );
    expect(el._confirmPanelOpen).toBe(false);
  });

  it("confirm cancel returns to editor without closing", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Keep editing" }],
        },
      ],
    };
    await editor.updateComplete;

    el.requestClose();
    await el.updateComplete;

    expect(el._confirmPanelOpen).toBe(true);

    const cancelBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-confirm-cancel"),
      "expected cancel button",
    );
    const focusSpy = vi.spyOn(editor, "focusInput");
    cancelBtn.click();
    await el.updateComplete;

    expect(el._confirmPanelOpen).toBe(false);
    expect(focusSpy).toHaveBeenCalled();
    // Editor content should be preserved
    expect(editor._bodyJson).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Keep editing" }],
        },
      ],
    });
  });

  it("requestClose on confirm panel dismisses it (Escape = Cancel)", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Esc test" }] },
      ],
    };
    await editor.updateComplete;

    el.requestClose();
    await el.updateComplete;
    expect(el._confirmPanelOpen).toBe(true);

    // Second requestClose (same path as Escape via dialog oncancel)
    el.requestClose();
    await el.updateComplete;

    expect(el._confirmPanelOpen).toBe(false);
    // Content should be preserved (not discarded)
    expect(editor._bodyJson).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Esc test" }] },
      ],
    });
  });

  it("confirm discard closes and resets", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Will discard" }],
        },
      ],
    };
    await editor.updateComplete;

    el.requestClose();
    await el.updateComplete;

    const discardBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-confirm-discard"),
      "expected discard button",
    );
    discardBtn.click();
    await el.updateComplete;

    expect(el._confirmPanelOpen).toBe(false);
    expect(el._format).toBe("note");
    expect(el._collectionIds).toEqual([]);
  });

  it("loaded draft shows format switcher and Post button, not edit mode", async () => {
    const el = await createElement();

    // Simulate what _loadDraft sets (without fetching)
    el._draftSourceId = "draft123";
    el._format = "note";
    await el.updateComplete;

    // Format switcher should be visible (not "Edit post" title)
    expect(el.querySelector(".compose-segmented")).not.toBeNull();
    expect(el.querySelector(".compose-dialog-title")).toBeNull();

    // Button should say "Post", not "Done"
    const postBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-main"),
      "expected post button",
    );
    expect(postBtn.textContent?.trim()).toBe("Post");
  });

  it("discard on loaded draft sends DELETE request", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );

    // Simulate loaded draft with content
    el._draftSourceId = "draft456";
    editor._bodyJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Draft content" }],
        },
      ],
    };
    await editor.updateComplete;

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    el.requestClose();
    await el.updateComplete;

    // Click "Don't save" (discard)
    const discardBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-confirm-discard"),
      "expected discard button",
    );
    discardBtn.click();
    await el.updateComplete;

    expect(fetchSpy).toHaveBeenCalledWith("/api/posts/draft456", {
      method: "DELETE",
    });

    fetchSpy.mockRestore();
  });

  it("submit from loaded draft includes draftSourceId as editPostId", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );

    el._draftSourceId = "draft789";
    editor._bodyJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Publish this draft" }],
        },
      ],
    };
    await editor.updateComplete;

    let receivedDetail: ComposeSubmitDetail | null = null;
    el.addEventListener("jant:compose-submit-deferred", (event) => {
      receivedDetail = (event as CustomEvent<ComposeSubmitDetail>).detail;
    });

    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-publish-main"),
      "expected post button",
    ).click();

    expect(receivedDetail).not.toBeNull();
    expect((receivedDetail as unknown as ComposeSubmitDetail).editPostId).toBe(
      "draft789",
    );
    expect((receivedDetail as unknown as ComposeSubmitDetail).status).toBe(
      "published",
    );
  });

  it("draft button confirm save dispatches draft then opens drafts panel", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Save then browse" }],
        },
      ],
    };
    await editor.updateComplete;

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ posts: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    let receivedDetail: ComposeSubmitDetail | null = null;
    el.addEventListener("jant:compose-submit-deferred", (event) => {
      receivedDetail = (event as CustomEvent<ComposeSubmitDetail>).detail;
    });

    // Click draft button → confirm panel
    const draftBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-dialog-header-btn"),
      "expected draft button",
    );
    draftBtn.click();
    await el.updateComplete;
    expect(el._confirmPanelOpen).toBe(true);

    // Click "Save"
    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-confirm-save"),
      "expected save button",
    ).click();
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;

    // Draft submitted
    expect(receivedDetail).not.toBeNull();
    expect((receivedDetail as unknown as ComposeSubmitDetail).status).toBe(
      "draft",
    );
    // Drafts panel opened instead of dialog closing
    expect(el._draftsPanelOpen).toBe(true);
    expect(el._confirmPanelOpen).toBe(false);

    fetchSpy.mockRestore();
  });

  it("draft button confirm discard opens drafts panel without saving", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._bodyJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Discard then browse" }],
        },
      ],
    };
    await editor.updateComplete;

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ posts: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    let submitFired = false;
    el.addEventListener("jant:compose-submit-deferred", () => {
      submitFired = true;
    });

    // Click draft button → confirm panel
    const draftBtn = requireElement(
      el.querySelector<HTMLButtonElement>(".compose-dialog-header-btn"),
      "expected draft button",
    );
    draftBtn.click();
    await el.updateComplete;

    // Click "Don't save"
    requireElement(
      el.querySelector<HTMLButtonElement>(".compose-confirm-discard"),
      "expected discard button",
    ).click();
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;

    // No submit dispatched
    expect(submitFired).toBe(false);
    // Drafts panel opened
    expect(el._draftsPanelOpen).toBe(true);
    expect(el._confirmPanelOpen).toBe(false);

    fetchSpy.mockRestore();
  });

  it("attachments detected as content for confirmation", async () => {
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
        progress: null,
        mediaId: "media-1",
        alt: "",
        error: null,
        summary: null,
        chars: null,
      },
    ];
    await editor.updateComplete;

    el.requestClose();
    await el.updateComplete;

    expect(el._confirmPanelOpen).toBe(true);
    expect(el.querySelector(".compose-confirm-panel")).not.toBeNull();

    URL.revokeObjectURL(previewUrl);
  });

  it("rating detected as content for confirmation", async () => {
    const el = await createElement();
    const editor = requireElement(
      el.querySelector<JantComposeEditor>("jant-compose-editor"),
      "expected compose editor",
    );
    editor._rating = 3;
    await editor.updateComplete;

    el.requestClose();
    await el.updateComplete;

    expect(el._confirmPanelOpen).toBe(true);
  });
});
