/**
 * Continuous Ordered Lists
 *
 * Rich-text sources can paste one visual ordered list as several adjacent
 * `<ol>` elements, each with its own `start` value. TipTap preserves those
 * values, so editing an earlier fragment does not renumber the later ones.
 *
 * Adjacent ordered-list nodes have no visible or semantic separator in the
 * editor. Join them into one node so the browser owns the numbering for the
 * whole logical list. A paragraph or any other block between lists remains an
 * intentional boundary and preserves a restart.
 */

import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { canJoin } from "@tiptap/pm/transform";

function findJoinableOrderedListBoundary(
  node: ProseMirrorNode,
  nodePosition = -1,
  document = node,
): number | null {
  const contentStart = nodePosition + 1;
  let childOffset = 0;
  let previousChild: ProseMirrorNode | null = null;

  for (let index = 0; index < node.childCount; index += 1) {
    const child = node.child(index);
    const childPosition = contentStart + childOffset;

    if (
      previousChild?.type.name === "orderedList" &&
      child.type.name === "orderedList" &&
      canJoin(document, childPosition)
    ) {
      return childPosition;
    }

    const nestedBoundary = findJoinableOrderedListBoundary(
      child,
      childPosition,
      document,
    );
    if (nestedBoundary !== null) return nestedBoundary;

    childOffset += child.nodeSize;
    previousChild = child;
  }

  return null;
}

/**
 * Builds a transaction that joins every adjacent ordered-list fragment.
 *
 * @param state - Current editor state
 * @returns A joining transaction, or null when the document is already normalized
 * @example
 * const tr = buildContinuousOrderedListsTransaction(editor.state);
 * if (tr) editor.view.dispatch(tr);
 */
export function buildContinuousOrderedListsTransaction(
  state: EditorState,
): Transaction | null {
  const tr = state.tr;
  let changed = false;
  let boundary = findJoinableOrderedListBoundary(tr.doc);

  while (boundary !== null) {
    tr.join(boundary);
    changed = true;
    boundary = findJoinableOrderedListBoundary(tr.doc);
  }

  return changed ? tr : null;
}

export const ContinuousOrderedLists = Extension.create({
  name: "continuousOrderedLists",

  onCreate() {
    const tr = buildContinuousOrderedListsTransaction(this.editor.state);
    if (tr) this.editor.view.dispatch(tr.setMeta("addToHistory", false));
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          return buildContinuousOrderedListsTransaction(newState);
        },
      }),
    ];
  },
});
