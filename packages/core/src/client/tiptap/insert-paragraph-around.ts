/**
 * Insert Paragraph Around Extension
 *
 * Lets the author create breathing room around hard-to-escape top-level
 * blocks like blockquotes, headings, lists, and code blocks.
 *
 *   - ArrowUp / ArrowLeft at the very start of the document's first block
 *     inserts an empty paragraph above it and moves the cursor there, but
 *     only when that first block is not already a paragraph. Without this,
 *     the cursor has nowhere to go above a top-level blockquote — "start of
 *     the doc" resolves to the start of the first child's content and
 *     pressing ArrowUp does nothing.
 *   - Mod-Shift-Enter inserts an empty paragraph before the current
 *     top-level block from anywhere inside it.
 *   - Mod-Alt-Enter does the same after the current top-level block.
 */

import { Extension, type Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

function insertAroundTopBlock(
  editor: Editor,
  placement: "above" | "below",
): boolean {
  const { state } = editor;
  const paragraphType = state.schema.nodes.paragraph;
  if (!paragraphType) return false;

  const { selection } = state;
  const { $from, $to } = selection;

  // When the selection is on the doc itself (NodeSelection of a top-level
  // atom, or a GapCursor) $from.depth is 0 and $from.before(1) would throw.
  // Fall back to the selection edges in that case.
  let insertPos: number;
  if ($from.depth === 0) {
    insertPos = placement === "above" ? selection.from : selection.to;
  } else {
    insertPos = placement === "above" ? $from.before(1) : $to.after(1);
  }

  const tr = state.tr.insert(insertPos, paragraphType.create());
  tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

export const InsertParagraphAround = Extension.create({
  name: "insertParagraphAround",

  addKeyboardShortcuts() {
    const escapeFromDocStart = ({ editor }: { editor: Editor }) => {
      const { state } = editor;
      const { selection } = state;
      if (!selection.empty) return false;

      const { $from } = selection;
      // Only fire at the very first position inside the first top-level
      // block. $from.depth >= 1 rules out gap cursors at the doc boundary,
      // and $from.pos === $from.depth means every ancestor index from doc
      // down is 0 and the cursor is at parentOffset 0 — i.e. no text or
      // sibling could plausibly receive the caret to our left / above.
      if ($from.depth < 1) return false;
      if ($from.pos !== $from.depth) return false;

      const firstBlock = state.doc.firstChild;
      if (!firstBlock || firstBlock.type.name === "paragraph") return false;

      return insertAroundTopBlock(editor, "above");
    };

    return {
      ArrowUp: escapeFromDocStart,
      ArrowLeft: escapeFromDocStart,
      "Mod-Shift-Enter": ({ editor }) => insertAroundTopBlock(editor, "above"),
      "Mod-Alt-Enter": ({ editor }) => insertAroundTopBlock(editor, "below"),
    };
  },
});
