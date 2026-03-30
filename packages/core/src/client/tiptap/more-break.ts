/**
 * MoreBreak Node Extension
 *
 * Custom Tiptap node that renders as a dashed "Read More" separator.
 * Atom node — not editable, but selectable and deletable.
 * Server-side renders to <!--more--> for excerpt splitting.
 */

import { canInsertNode, isNodeSelection, Node } from "@tiptap/core";
import { moveSelectionAfterBlockInsertion } from "./block-insertion.js";

const MORE_BREAK_MARKER = "<!--more-->";
const MORE_BREAK_COMMENT = "more";
const MORE_BREAK_VISIBLE_LABELS = new Set(["Read More ↓", "Read More"]);
const COMMENT_NODE = 8;
const TEXT_NODE = 3;

function createMoreBreakElement(
  doc: globalThis.Document,
): globalThis.HTMLDivElement {
  const element = doc.createElement("div");
  element.setAttribute("data-more-break", "");
  element.className = "tiptap-more-break";
  element.textContent = "Read More ↓";
  return element;
}

function replaceMoreBreakMarkers(root: globalThis.ParentNode) {
  const doc = root.ownerDocument;
  if (!doc) return;

  const replacements: globalThis.ChildNode[] = [];

  const isMoreBreakText = (value: string) => {
    const normalized = value.trim();
    return (
      normalized === MORE_BREAK_MARKER ||
      MORE_BREAK_VISIBLE_LABELS.has(normalized)
    );
  };

  const visit = (node: globalThis.ParentNode) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === COMMENT_NODE) {
        if (
          (child.nodeValue ?? "").trim().toLowerCase() === MORE_BREAK_COMMENT
        ) {
          replacements.push(child);
        }
        continue;
      }

      if (child.nodeType === TEXT_NODE) {
        if (isMoreBreakText(child.nodeValue ?? "")) {
          replacements.push(child);
        }
        continue;
      }

      if (child.hasChildNodes()) {
        visit(child as unknown as globalThis.ParentNode);
      }
    }
  };

  visit(root);

  for (const child of replacements) {
    child.parentNode?.replaceChild(createMoreBreakElement(doc), child);
  }
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    moreBreak: {
      insertMoreBreak: () => ReturnType;
    };
  }
}

export const MoreBreak = Node.create({
  name: "moreBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addStorage() {
    return {
      markdown: {
        serialize(
          state: {
            write: (value: string) => void;
            closeBlock: (node: unknown) => void;
          },
          node: unknown,
        ) {
          state.write(MORE_BREAK_MARKER);
          state.closeBlock(node);
        },
        parse: {
          updateDOM(element: globalThis.ParentNode) {
            replaceMoreBreakMarkers(element);
          },
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-more-break]" }];
  },

  renderHTML() {
    return [
      "div",
      {
        "data-more-break": "",
        class: "tiptap-more-break",
      },
      "Read More ↓",
    ];
  },

  renderText() {
    return MORE_BREAK_MARKER;
  },

  addCommands() {
    return {
      insertMoreBreak:
        () =>
        ({ chain, state }) => {
          if (!canInsertNode(state, state.schema.nodes[this.name])) {
            return false;
          }

          const { $to: $originTo } = state.selection;
          const currentChain = chain();

          if (isNodeSelection(state.selection)) {
            currentChain.insertContentAt($originTo.pos, { type: this.name });
          } else {
            currentChain.insertContent({ type: this.name });
          }

          return currentChain
            .command(({ state: chainState, tr, dispatch }) => {
              if (dispatch) {
                moveSelectionAfterBlockInsertion(tr, chainState.schema);
              }

              return true;
            })
            .run();
        },
    };
  },
});
