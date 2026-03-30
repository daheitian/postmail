import type { Schema } from "@tiptap/pm/model";
import {
  NodeSelection,
  TextSelection,
  type Transaction,
} from "@tiptap/pm/state";

export function moveSelectionAfterBlockInsertion(
  tr: Transaction,
  schema: Schema,
  nextNodeType = "paragraph",
) {
  const { $to } = tr.selection;
  const posAfter = $to.end();

  if ($to.nodeAfter) {
    if ($to.nodeAfter.isTextblock) {
      tr.setSelection(TextSelection.create(tr.doc, $to.pos + 1));
    } else if ($to.nodeAfter.isBlock) {
      tr.setSelection(NodeSelection.create(tr.doc, $to.pos));
    } else {
      tr.setSelection(TextSelection.create(tr.doc, $to.pos));
    }
  } else {
    const nodeType =
      schema.nodes[nextNodeType] ?? $to.parent.type.contentMatch.defaultType;
    const node = nodeType?.create();

    if (node) {
      tr.insert(posAfter, node);
      tr.setSelection(TextSelection.create(tr.doc, posAfter + 1));
    }
  }

  tr.scrollIntoView();
}
