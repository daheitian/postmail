// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from "vitest";
import type { ComposeLabels } from "../compose-types.js";
import "../jant-compose-editor.js";
import type { JantComposeEditor } from "../jant-compose-editor.js";

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
    const textarea = el.querySelector<HTMLTextAreaElement>(
      ".compose-body-input",
    );
    expect(textarea).not.toBeNull();
    expect(textarea!.placeholder).toBe("What's on your mind...");
  });

  it("renders link fields when format is link", async () => {
    const el = await createElement("link");
    const urlInput = el.querySelector<HTMLInputElement>('input[type="url"]');
    expect(urlInput).not.toBeNull();
    expect(urlInput!.placeholder).toBe("Paste a URL...");

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
    const scoreBtn =
      el.querySelectorAll<HTMLButtonElement>(".compose-tool-btn");
    // Score is the third tool button
    const scoreBtnEl = scoreBtn[2];
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

  it("toggles attached text panel", async () => {
    const el = await createElement("note");

    // Click attached text tool button
    const toolBtns =
      el.querySelectorAll<HTMLButtonElement>(".compose-tool-btn");
    const attachedBtn = toolBtns[1]; // second tool button
    attachedBtn.click();
    await el.updateComplete;

    expect(el.querySelector(".compose-attached-panel")).not.toBeNull();

    // Click done button to close
    const doneBtn = el.querySelector<HTMLButtonElement>(
      ".compose-attached-panel .compose-post-btn",
    );
    doneBtn?.click();
    await el.updateComplete;

    expect(el.querySelector(".compose-attached-panel")).toBeNull();
  });

  it("shows title toggle only in note mode", async () => {
    const el = await createElement("note");
    const toolSep = el.querySelector(".compose-tool-sep");
    expect(toolSep).not.toBeNull();

    el.format = "link";
    await el.updateComplete;
    expect(el.querySelector(".compose-tool-sep")).toBeNull();
  });

  it("getData returns current field values", async () => {
    const el = await createElement("note");
    el._title = "Test Title";
    el._body = "Test Body";
    el._rating = 4;
    el._attachedText = "Some attached text";

    const data = el.getData();
    expect(data.title).toBe("Test Title");
    expect(data.body).toBe("Test Body");
    expect(data.rating).toBe(4);
    expect(data.attachedText).toBe("Some attached text");
    expect(data.url).toBe("");
    expect(data.quoteText).toBe("");
    expect(data.quoteAuthor).toBe("");
  });

  it("reset clears all fields", async () => {
    const el = await createElement("note");
    el._title = "Test";
    el._body = "Body";
    el._rating = 3;
    el._showRating = true;
    el._attachedText = "text";
    el._showAttachedText = true;

    el.reset();

    expect(el._title).toBe("");
    expect(el._body).toBe("");
    expect(el._rating).toBe(0);
    expect(el._showRating).toBe(false);
    expect(el._attachedText).toBe("");
    expect(el._showAttachedText).toBe(false);
  });

  it("shows attached text badge when text is present", async () => {
    const el = await createElement("note");
    el._attachedText = "Some content here";
    await el.updateComplete;

    const badge = el.querySelector(".compose-attached-badge");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain("chars");
  });

  it("dispatches jant:open-media-picker on media button click", async () => {
    const el = await createElement("note");
    let dispatched = false;
    el.addEventListener("jant:open-media-picker", () => {
      dispatched = true;
    });

    const mediaBtn = el.querySelector<HTMLButtonElement>(".compose-tool-btn");
    mediaBtn?.click();

    expect(dispatched).toBe(true);
  });
});
