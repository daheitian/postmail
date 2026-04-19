// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextSelection } from "@tiptap/pm/state";
import { InsertParagraphAround } from "../insert-paragraph-around.js";

const editors: Editor[] = [];

function createEditor(content: string) {
  const element = document.createElement("div");
  document.body.appendChild(element);

  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: false },
      }),
      InsertParagraphAround,
    ],
    content,
  });

  // Any first transaction flushes happy-dom's synthetic DOM-change, which in
  // this test environment appends an auto trailing paragraph. Running it
  // once up front means later pos-based assertions count deltas instead of
  // racing with that artifact.
  editor.view.dispatch(editor.state.tr);

  editors.push(editor);
  return editor;
}

function setCursor(editor: Editor, pos: number) {
  editor.view.dispatch(
    editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos)),
  );
}

function pressKey(editor: Editor, key: string) {
  return editor.view.someProp("handleKeyDown", (fn) =>
    fn(
      editor.view,
      new KeyboardEvent("keydown", {
        key,
        code: key,
      }),
    ),
  );
}

function pressModShiftEnter(editor: Editor) {
  return editor.view.someProp("handleKeyDown", (fn) =>
    fn(
      editor.view,
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        shiftKey: true,
        ctrlKey: true,
      }),
    ),
  );
}

function pressModAltEnter(editor: Editor) {
  return editor.view.someProp("handleKeyDown", (fn) =>
    fn(
      editor.view,
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        altKey: true,
        ctrlKey: true,
      }),
    ),
  );
}

afterEach(() => {
  while (editors.length > 0) {
    editors.pop()?.destroy();
  }
  document.body.innerHTML = "";
});

describe("InsertParagraphAround: ArrowUp / ArrowLeft at doc start", () => {
  it("inserts an empty paragraph before a leading blockquote on ArrowUp", () => {
    const editor = createEditor("<blockquote><p>hello</p></blockquote>");
    setCursor(editor, 2); // inside blockquote's <p>, at the very start

    const before = editor.state.doc.childCount;
    const handled = pressKey(editor, "ArrowUp");

    expect(handled).toBe(true);
    expect(editor.state.doc.childCount).toBe(before + 1);
    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(editor.state.doc.firstChild?.textContent).toBe("");
    expect(editor.state.doc.child(1).type.name).toBe("blockquote");
    // Cursor lands in the new leading paragraph.
    expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");
    expect(editor.state.selection.$from.pos).toBe(1);
  });

  it("also fires on ArrowLeft", () => {
    const editor = createEditor("<blockquote><p>hello</p></blockquote>");
    setCursor(editor, 2);

    const before = editor.state.doc.childCount;
    const handled = pressKey(editor, "ArrowLeft");

    expect(handled).toBe(true);
    expect(editor.state.doc.childCount).toBe(before + 1);
    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
  });

  it("fires for a leading heading too", () => {
    const editor = createEditor("<h1>Title</h1><p>body</p>");
    setCursor(editor, 1); // very start of the <h1>

    const handled = pressKey(editor, "ArrowUp");

    expect(handled).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(editor.state.doc.firstChild?.textContent).toBe("");
    expect(editor.state.doc.child(1).type.name).toBe("heading");
  });

  it("does nothing when the first block is already a paragraph", () => {
    const editor = createEditor("<p>hi</p><blockquote><p>q</p></blockquote>");
    setCursor(editor, 1); // start of leading paragraph

    const before = editor.state.doc.childCount;
    const handled = pressKey(editor, "ArrowUp");

    expect(handled).toBeFalsy();
    expect(editor.state.doc.childCount).toBe(before);
    expect(editor.state.doc.firstChild?.textContent).toBe("hi");
  });

  it("does nothing when the cursor is not at the very first position", () => {
    const editor = createEditor("<blockquote><p>hello</p></blockquote>");
    setCursor(editor, 4); // middle of "hello"

    const before = editor.state.doc.childCount;
    const handled = pressKey(editor, "ArrowUp");

    expect(handled).toBeFalsy();
    expect(editor.state.doc.childCount).toBe(before);
  });

  it("does nothing when inside a later blockquote, not the first", () => {
    const editor = createEditor(
      "<p>first</p><blockquote><p>second</p></blockquote>",
    );
    // doc: p("first") + bq(p("second"))
    // Positions: 0=before p, 1=start of "first", 7=after p, 8=inside bq,
    // 9=start of "second" — cursor not at doc start.
    setCursor(editor, 9);

    const before = editor.state.doc.childCount;
    const handled = pressKey(editor, "ArrowUp");

    expect(handled).toBeFalsy();
    expect(editor.state.doc.childCount).toBe(before);
  });
});

describe("InsertParagraphAround: Mod-Shift-Enter / Mod-Alt-Enter", () => {
  it("Mod-Shift-Enter inserts a paragraph before the current top-level block", () => {
    const editor = createEditor("<blockquote><p>hello</p></blockquote>");
    setCursor(editor, 4); // middle of "hello"

    const before = editor.state.doc.childCount;
    const handled = pressModShiftEnter(editor);

    expect(handled).toBe(true);
    expect(editor.state.doc.childCount).toBe(before + 1);
    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(editor.state.doc.firstChild?.textContent).toBe("");
    expect(editor.state.doc.child(1).type.name).toBe("blockquote");
    expect(editor.state.doc.child(1).textContent).toBe("hello");
    expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");
    expect(editor.state.selection.$from.pos).toBe(1);
  });

  it("Mod-Alt-Enter inserts a paragraph after the current top-level block", () => {
    const editor = createEditor("<blockquote><p>hello</p></blockquote>");
    setCursor(editor, 4);

    const before = editor.state.doc.childCount;
    const blockquoteSize = editor.state.doc.firstChild!.nodeSize;
    const handled = pressModAltEnter(editor);

    expect(handled).toBe(true);
    expect(editor.state.doc.childCount).toBe(before + 1);
    expect(editor.state.doc.firstChild?.type.name).toBe("blockquote");
    expect(editor.state.doc.child(1).type.name).toBe("paragraph");
    expect(editor.state.doc.child(1).textContent).toBe("");
    // Cursor sits just inside the inserted trailing paragraph.
    expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");
    expect(editor.state.selection.$from.pos).toBe(blockquoteSize + 1);
  });

  it("Mod-Shift-Enter escapes the top-level block from nested content", () => {
    const editor = createEditor(
      "<ul><li><p>one</p></li><li><p>two</p></li></ul>",
    );
    // Cursor inside the paragraph of the 2nd list item.
    // Walk to a safe position within the second item's text.
    const listNode = editor.state.doc.firstChild!;
    const firstItem = listNode.child(0);
    const pos = 1 /* into <ul> */ + firstItem.nodeSize + 2; /* into <li><p> */
    setCursor(editor, pos);

    const before = editor.state.doc.childCount;
    const handled = pressModShiftEnter(editor);

    expect(handled).toBe(true);
    expect(editor.state.doc.childCount).toBe(before + 1);
    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(editor.state.doc.firstChild?.textContent).toBe("");
    expect(editor.state.doc.child(1).type.name).toBe("bulletList");
  });
});
