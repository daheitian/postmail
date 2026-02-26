/**
 * Exitable Marks Extension
 *
 * Two behaviors for escaping inline marks (bold, italic, strike, code, underline):
 *
 * 1. ArrowRight at end of block — clears stored marks so next typed char is plain.
 * 2. Enter on an empty block — clears stored marks on the new paragraph.
 *    (Typing bold → Enter → empty line → Enter = formatting resets.)
 */

import { Extension } from "@tiptap/core";

const EXITABLE_MARKS = new Set([
  "bold",
  "italic",
  "strike",
  "code",
  "underline",
]);

function getExitableMarks(marks: readonly import("@tiptap/pm/model").Mark[]) {
  return marks.filter((m) => EXITABLE_MARKS.has(m.type.name));
}

export const ExitableMarks = Extension.create({
  name: "exitableMarks",

  addKeyboardShortcuts() {
    return {
      ArrowRight: ({ editor }) => {
        const { selection } = editor.state;
        const { $from } = selection;

        if (!selection.empty) return false;
        if ($from.pos !== $from.end()) return false;

        const exitables = getExitableMarks($from.marks());
        if (!exitables.length) return false;

        // Clear stored marks; return true to consume event (don't jump to next block)
        const { tr } = editor.state;
        for (const mark of exitables) {
          tr.removeStoredMark(mark);
        }
        editor.view.dispatch(tr);
        return true;
      },

      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const { $from } = selection;

        if (!selection.empty) return false;

        // Only act on empty blocks (e.g. a blank bold line)
        if ($from.parent.textContent.length > 0) return false;

        const storedMarks = editor.state.storedMarks ?? $from.marks();
        const exitables = getExitableMarks(storedMarks);
        if (!exitables.length) return false;

        // Let ProseMirror create the new paragraph first, then clear marks
        requestAnimationFrame(() => {
          const { tr } = editor.state;
          tr.setStoredMarks([]);
          editor.view.dispatch(tr);
        });

        return false;
      },
    };
  },
});
