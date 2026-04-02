/**
 * MoreBreak Node Extension
 *
 * Custom Tiptap node that renders as a dashed "Read More" separator.
 * Atom node — not editable, but selectable and deletable.
 * Server-side renders to <!--more--> for excerpt splitting.
 */

import { canInsertNode, isNodeSelection, Node } from "@tiptap/core";
import { createMoreBreakMarkdownToken } from "../../lib/markdown-manager.js";
import { moveSelectionAfterBlockInsertion } from "./block-insertion.js";

const MORE_BREAK_MARKER = "<!--more-->";

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

  parseMarkdown: (_token, helpers) => helpers.createNode("moreBreak"),
  renderMarkdown: () => MORE_BREAK_MARKER,
  markdownTokenizer: createMoreBreakMarkdownToken(),

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
