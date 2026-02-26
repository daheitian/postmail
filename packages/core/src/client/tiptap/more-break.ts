/**
 * MoreBreak Node Extension
 *
 * Custom Tiptap node that renders as a dashed "Read More" separator.
 * Atom node — not editable, but selectable and deletable.
 * Server-side renders to <!--more--> for excerpt splitting.
 */

import { Node } from "@tiptap/core";

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

  addCommands() {
    return {
      insertMoreBreak:
        () =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name });
        },
    };
  },
});
