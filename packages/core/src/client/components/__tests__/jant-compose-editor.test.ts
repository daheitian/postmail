// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from "vitest";
import type { ComposeLabels } from "../compose-types.js";
import "../jant-compose-editor.js";
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

function requireItem<T extends globalThis.Element>(
  collection: globalThis.NodeListOf<T>,
  index: number,
  message: string,
): T {
  const item = collection.item(index);
  if (!item) {
    throw new Error(message);
  }
  return item;
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
  showMore: "Show more",
  showLess: "Show less",
  collectionFormLabels: {
    titleLabel: "Title",
    titlePlaceholder: "My Collection",
    slugLabel: "Collection link",
    slugHelp: "This is the last part of the collection link.",
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

async function createElement(
  format: string = "note",
): Promise<JantComposeEditor> {
  const el = document.createElement("jant-compose-editor") as JantComposeEditor;
  el.format = format as "note" | "link" | "quote";
  el.labels = labels;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe("JantComposeEditor", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders note fields by default", async () => {
    const el = await createElement("note");
    const tiptapContainer = requireElement(
      el.querySelector<HTMLElement>(".compose-tiptap-body"),
      "expected compose Tiptap body container",
    );
    expect(tiptapContainer).toBeTruthy();
  });

  it("renders link fields when format is link", async () => {
    const el = await createElement("link");
    const urlInput = requireElement(
      el.querySelector<HTMLInputElement>('input[type="url"]'),
      "expected url input",
    );
    expect(urlInput.placeholder).toBe("Paste a URL...");

    const titleInput = el.querySelector<HTMLInputElement>(
      ".compose-link-title",
    );
    expect(titleInput).not.toBeNull();
  });

  it("renders quote fields when format is quote", async () => {
    const el = await createElement("quote");
    const quoteTextarea = el.querySelector<HTMLTextAreaElement>(
      ".compose-quote-text",
    );
    expect(quoteTextarea).not.toBeNull();

    const authorInput = el.querySelector<HTMLInputElement>(
      ".compose-quote-author",
    );
    expect(authorInput).not.toBeNull();
  });

  it("toggles star rating visibility", async () => {
    const el = await createElement("note");

    // Rating not visible initially
    expect(el.querySelector(".compose-star-rating")).toBeNull();

    // Click score button to show rating
    const scoreBtnEl = requireElement(
      el.querySelector<HTMLButtonElement>('.compose-tool-btn[title="Rate"]'),
      "expected score tool button",
    );
    scoreBtnEl.click();
    await el.updateComplete;

    expect(el.querySelector(".compose-star-rating")).not.toBeNull();
  });

  it("sets rating on star click and deselects on same star", async () => {
    const el = await createElement("note");
    el._showRating = true;
    await el.updateComplete;

    const stars = el.querySelectorAll<HTMLButtonElement>(".compose-star");
    expect(stars.length).toBe(5);

    // Click third star
    stars[2].click();
    await el.updateComplete;
    expect(el._rating).toBe(3);

    // Rating label shows
    const label = el.querySelector(".compose-star-label");
    expect(label?.textContent).toContain("3/5");

    // Click third star again to deselect
    stars[2].click();
    await el.updateComplete;
    expect(el._rating).toBe(0);
  });

  it("dispatches attached panel open event and creates new item", async () => {
    const el = await createElement("note");

    const events: CustomEvent[] = [];
    el.addEventListener("jant:attached-panel-open", (e) =>
      events.push(e as CustomEvent),
    );

    // Click attached text tool button
    const toolBtns =
      el.querySelectorAll<HTMLButtonElement>(".compose-tool-btn");
    const attachedBtn = requireItem(
      toolBtns,
      1,
      "expected attached text button",
    );
    attachedBtn.click();
    await el.updateComplete;

    expect(events).toHaveLength(1);
    expect(events[0].detail.index).toBe(0);
    expect(el._attachedTexts).toHaveLength(1);
    expect(el._attachedTexts[0].bodyJson).toBeNull();
  });

  it("shows title toggle only in note mode", async () => {
    const el = await createElement("note");
    expect(el.querySelector('.compose-tool-btn[title="Title"]')).not.toBeNull();

    el.format = "link";
    await el.updateComplete;
    expect(el.querySelector('.compose-tool-btn[title="Title"]')).toBeNull();
  });

  it("keeps title after rate and places fullscreen at the far right of the toolbar", async () => {
    const el = await createElement("note");
    const toolTitles = [
      ...el.querySelectorAll<HTMLButtonElement>(".compose-tool-btn"),
    ].map((button) => button.getAttribute("title"));

    expect(toolTitles).toEqual([
      "Media",
      "Attached Text",
      "Emoji",
      "Rate",
      "Title",
      "Fullscreen",
    ]);
    expect(
      el.querySelector('.compose-tool-btn-view[aria-label="Fullscreen"]'),
    ).not.toBeNull();
  });

  it("getData returns current field values", async () => {
    const el = await createElement("note");
    el._title = "Test Title";
    el._showTitle = true;
    el._bodyJson = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Test Body" }] },
      ],
    };
    el._rating = 4;
    el._attachedTexts = [
      {
        clientId: "t1",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Some attached text" }],
            },
          ],
        },
        summary: "Some attached text",
        bodyHtml: "<p>Some attached text</p>",
      },
    ];

    const data = el.getData();
    expect(data.title).toBe("Test Title");
    expect(data.body).toContain("Test Body");
    expect(data.rating).toBe(4);
    expect(data.attachedTexts).toHaveLength(1);
    expect(data.attachedTexts[0].bodyJson).not.toBeNull();
    expect(data.url).toBe("");
    expect(data.quoteText).toBe("");
    expect(data.quoteAuthor).toBe("");
  });

  it("getData omits title when showTitle is off in note mode", async () => {
    const el = await createElement("note");
    el._title = "Hidden Title";
    el._showTitle = false;

    const data = el.getData();
    expect(data.title).toBe("");
  });

  it("preserves title in memory when toggling off and restores on toggle on", async () => {
    const el = await createElement("note");
    el._title = "My Title";
    el._showTitle = true;
    await el.updateComplete;

    // Toggle off — title stays in memory
    el._showTitle = false;
    await el.updateComplete;
    expect(el._title).toBe("My Title");
    expect(el.getData().title).toBe("");

    // Toggle back on — title restored
    el._showTitle = true;
    await el.updateComplete;
    expect(el.getData().title).toBe("My Title");
  });

  it("reset clears all fields", async () => {
    const el = await createElement("note");
    el._title = "Test";
    el._bodyJson = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Body" }] },
      ],
    };
    el._rating = 3;
    el._showRating = true;
    el._attachedTexts = [
      {
        clientId: "t1",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "text" }],
            },
          ],
        },
        summary: "text",
        bodyHtml: "<p>text</p>",
      },
    ];

    el.reset();

    expect(el._title).toBe("");
    expect(el._bodyJson).toBeNull();
    expect(el._rating).toBe(0);
    expect(el._showRating).toBe(false);
    expect(el._attachedTexts).toEqual([]);
  });

  it("shows attached text card in attachment strip", async () => {
    const el = await createElement("note");
    el._attachedTexts = [
      {
        clientId: "t1",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Some content here" }],
            },
          ],
        },
        summary: "Some content here",
        bodyHtml: "<p>Some content here</p>",
      },
    ];
    el._attachmentOrder = ["t1"];
    await el.updateComplete;

    const card = el.querySelector(".compose-attachment-text-card");
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain("Some content here");
  });

  it("media button shows inline add label when attachments are present", async () => {
    const el = await createElement("note");

    // Media button should not have add style initially
    const mediaBtn = el.querySelector<HTMLButtonElement>(".compose-tool-btn");
    expect(mediaBtn?.classList.contains("compose-tool-btn-add")).toBe(false);

    // Add an attachment
    const blob = new Blob(["fake"], { type: "image/png" });
    const file = new File([blob], "test.png", { type: "image/png" });
    el._attachments = [
      {
        clientId: "test-1",
        file,
        previewUrl: URL.createObjectURL(blob),
        status: "done",
        progress: null,
        mediaId: "m1",
        alt: "",
        error: null,
        summary: null,
        chars: null,
      },
    ];
    await el.updateComplete;

    const mediaBtnAfter =
      el.querySelector<HTMLButtonElement>(".compose-tool-btn");
    expect(mediaBtnAfter?.classList.contains("compose-tool-btn-add")).toBe(
      true,
    );

    // Should show inline label, not tooltip
    const label = mediaBtnAfter?.querySelector(".compose-tool-label");
    expect(label).not.toBeNull();
    expect(label?.textContent).toBe("Add");
  });

  it("moves attachments later with keyboard controls", async () => {
    const el = await createElement("note");
    const blob = new Blob(["fake"], { type: "image/png" });
    const file = new File([blob], "test.png", { type: "image/png" });
    el._attachments = [
      {
        clientId: "a1",
        file,
        previewUrl: URL.createObjectURL(blob),
        status: "done",
        progress: null,
        mediaId: "m1",
        alt: "",
        error: null,
        summary: null,
        chars: null,
      },
      {
        clientId: "a2",
        file,
        previewUrl: URL.createObjectURL(blob),
        status: "done",
        progress: null,
        mediaId: "m2",
        alt: "",
        error: null,
        summary: null,
        chars: null,
      },
    ];
    el._attachmentOrder = ["a1", "a2"];
    await el.updateComplete;

    const attachment = requireElement(
      el.querySelector<HTMLElement>(
        '[data-attachment-id="a1"] [data-attachment-sortable]',
      ),
      "expected attachment card",
    );
    attachment.dispatchEvent(
      new globalThis.KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
      }),
    );
    await el.updateComplete;

    expect(el._attachmentOrder).toEqual(["a2", "a1"]);
  });

  it("preserves mixed attachment order when populate provides one", async () => {
    const el = await createElement("note");

    el.populate({
      format: "note",
      media: [
        {
          id: "m1",
          previewUrl: "/a.png",
          mimeType: "image/png",
        },
      ],
      textAttachments: [
        {
          clientId: "t1",
          bodyJson: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Text attachment" }],
              },
            ],
          }),
          bodyHtml: "<p>Text attachment</p>",
          summary: "Text attachment",
        },
      ],
      attachmentOrder: ["t1", "m1"],
    });
    await el.updateComplete;

    const items = [
      ...el.querySelectorAll<HTMLElement>("[data-attachment-id]"),
    ].map((item) => item.dataset.attachmentId);

    expect(items).toHaveLength(2);
    expect(items[0]).toBe(el._attachmentOrder[0]);
    expect(items[1]).toBe(el._attachmentOrder[1]);
    expect(el._attachmentOrder[0]).toBe("t1");
  });
});
