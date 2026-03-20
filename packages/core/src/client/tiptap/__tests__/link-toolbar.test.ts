// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { BubbleMenu } from "../bubble-menu.js";
import { LinkToolbar } from "../link-toolbar.js";

const editors: Editor[] = [];

function requireElement<T extends globalThis.Element>(
  element: T | null,
  message: string,
): T {
  if (!element) {
    throw new Error(message);
  }
  return element;
}

function createEditor() {
  const element = document.createElement("div");
  document.body.appendChild(element);

  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: false },
      }),
      BubbleMenu.configure({ toolbarMode: "compose" }),
      LinkToolbar.configure({ toolbarMode: "compose" }),
    ],
    content: "<p>Hello world</p>",
  });

  vi.spyOn(editor.view, "coordsAtPos").mockImplementation(() => ({
    left: 120,
    right: 180,
    top: 120,
    bottom: 140,
  }));

  editors.push(editor);
  return editor;
}

afterEach(() => {
  vi.restoreAllMocks();
  while (editors.length > 0) {
    editors.pop()?.destroy();
  }
  document.body.innerHTML = "";
});

describe("LinkToolbar", () => {
  it("collapses the selection to the link end after confirming with Enter", async () => {
    const editor = createEditor();

    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.view.dom.dispatchEvent(new CustomEvent("tiptap:open-link-input"));

    const input = requireElement(
      document.querySelector<HTMLInputElement>(".tiptap-link-input-field"),
      "expected link input field",
    );

    input.value = "https://example.com";
    input.dispatchEvent(
      new globalThis.KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      }),
    );

    await Promise.resolve();

    expect(editor.state.selection.empty).toBe(true);
    expect(editor.state.selection.from).toBe(6);
    expect(editor.state.selection.to).toBe(6);
    expect(editor.isActive("link")).toBe(false);
    expect(
      document.querySelector<HTMLElement>(".tiptap-link-input")?.style.display,
    ).toBe("none");
    expect(
      document.querySelector<HTMLElement>(".tiptap-link-preview")?.style
        .display,
    ).toBe("none");
    expect(
      document.querySelector<HTMLElement>(".tiptap-bubble-menu")?.style.display,
    ).toBe("none");
  });
});
