// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextSelection } from "@tiptap/pm/state";
import { TabIndent } from "../tab-indent.js";
import { WrappingInputRules } from "../wrapping-input-rules.js";
import { clearFormatting } from "../bubble-menu.js";

const editors: Editor[] = [];

function createEditor(content: string): Editor {
  const element = document.createElement("div");
  document.body.appendChild(element);

  const editor = new Editor({
    element,
    extensions: [StarterKit, WrappingInputRules, TabIndent],
    content,
  });

  editor.view.dispatch(editor.state.tr);
  editors.push(editor);
  return editor;
}

function setCursor(editor: Editor, pos: number): void {
  editor.view.dispatch(
    editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos)),
  );
}

function typeText(editor: Editor, text: string): void {
  for (const character of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp("handleTextInput", (handler) =>
      handler(editor.view, from, to, character, () =>
        editor.state.tr.insertText(character, from, to),
      ),
    );

    if (!handled) {
      editor.view.dispatch(editor.state.tr.insertText(character, from, to));
    }
  }
}

function pressKey(editor: Editor, key: string, shiftKey = false): boolean {
  return Boolean(
    editor.view.someProp("handleKeyDown", (handler) =>
      handler(
        editor.view,
        new KeyboardEvent("keydown", {
          key,
          code: key,
          shiftKey,
        }),
      ),
    ),
  );
}

afterEach(() => {
  while (editors.length > 0) editors.pop()?.destroy();
  document.body.innerHTML = "";
});

describe("ordered-list editing", () => {
  it("joins an expected next number to the preceding ordered list", () => {
    const editor = createEditor(
      '<ol start="5"><li><p>Five</p></li><li><p>Six</p></li></ol><p></p>',
    );
    setCursor(editor, editor.state.doc.content.size - 1);

    typeText(editor, "7. ");

    expect(editor.state.doc.firstChild?.childCount).toBe(3);
    expect(editor.state.doc.firstChild?.type.name).toBe("orderedList");
    expect(editor.state.doc.firstChild?.attrs.start).toBe(5);
  });

  it("uses Tab and Shift-Tab to nest and unnest an ordered-list item", () => {
    const editor = createEditor(
      "<ol><li><p>One</p></li><li><p>Two</p></li><li><p>Three</p></li></ol>",
    );
    const list = editor.state.doc.firstChild!;
    const secondItemPos = 1 + list.child(0).nodeSize + 2;
    setCursor(editor, secondItemPos);

    expect(pressKey(editor, "Tab")).toBe(true);

    const nestedParent = editor.state.doc.firstChild?.child(0);
    expect(editor.state.doc.firstChild?.childCount).toBe(2);
    expect(nestedParent?.lastChild?.type.name).toBe("orderedList");
    expect(nestedParent?.lastChild?.firstChild?.textContent).toBe("Two");

    expect(pressKey(editor, "Tab", true)).toBe(true);

    expect(editor.state.doc.firstChild?.childCount).toBe(3);
    expect(
      editor.state.doc.firstChild?.content.content.map(
        (item) => item.textContent,
      ),
    ).toEqual(["One", "Two", "Three"]);
  });

  it("consumes Tab when the first list item cannot be indented", () => {
    const editor = createEditor(
      "<ol><li><p>One</p></li><li><p>Two</p></li></ol>",
    );
    setCursor(editor, 3);
    const before = editor.getJSON();

    expect(pressKey(editor, "Tab")).toBe(true);
    expect(editor.getJSON()).toEqual(before);
  });

  it("clears marks without changing a pasted blockquote or nested ordered list", () => {
    const editor = createEditor(
      '<blockquote><ol start="5"><li><p><a href="https://example.com"><strong>Five</strong></a></p><ol><li><p>Nested</p></li></ol></li><li><p><em>Six</em></p></li></ol></blockquote>',
    );
    let from = Number.POSITIVE_INFINITY;
    let to = 0;
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return;
      from = Math.min(from, pos);
      to = Math.max(to, pos + node.nodeSize);
    });
    editor.view.dispatch(
      editor.state.tr.setSelection(
        TextSelection.create(editor.state.doc, from, to),
      ),
    );

    clearFormatting(editor);

    const blockquote = editor.state.doc.firstChild;
    const outerList = blockquote?.firstChild;
    expect(blockquote?.type.name).toBe("blockquote");
    expect(outerList?.type.name).toBe("orderedList");
    expect(outerList?.attrs.start).toBe(5);
    expect(outerList?.childCount).toBe(2);
    expect(outerList?.child(0).lastChild?.type.name).toBe("orderedList");
    expect(outerList?.child(0).lastChild?.firstChild?.textContent).toBe(
      "Nested",
    );
    const linkedText = outerList?.child(0).firstChild?.firstChild;
    expect(linkedText?.marks.map((mark) => mark.type.name)).toEqual(["link"]);
    expect(linkedText?.marks[0]?.attrs.href).toBe("https://example.com");
    expect(editor.isActive("bold")).toBe(false);
    expect(editor.isActive("italic")).toBe(false);
  });
});
