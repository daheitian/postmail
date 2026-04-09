import { Extension, InputRule } from "@tiptap/core";
import { sanitizeUrl } from "../../lib/url.js";

// The URL group uses [^()\s] (single char) instead of [^()\s]+ to avoid
// catastrophic backtracking from nested quantifiers when the regex fails
// to match (e.g. "[text](url) " — trailing space makes \)$ fail and the
// engine explores 2^n partitions of the URL characters).
const MARKDOWN_LINK_INPUT_REGEX =
  /\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)$/;
const BARE_URL_INPUT_REGEX = /((?:https?:\/\/|mailto:)[^\s<]+)\s$/;

export const LinkInputRules = Extension.create({
  name: "linkInputRules",

  addInputRules() {
    const linkType = this.editor.schema.marks.link;

    if (!linkType) return [];

    return [
      new InputRule({
        find: BARE_URL_INPUT_REGEX,
        handler: ({ state, range, match }) => {
          const href = sanitizeUrl(match[1] ?? "");

          if (!href) {
            return null;
          }

          const textEnd = range.from + href.length;
          if (state.doc.rangeHasMark(range.from, textEnd, linkType)) {
            return null;
          }

          state.tr.addMark(range.from, textEnd, linkType.create({ href }));
          state.tr.removeStoredMark(linkType);
        },
      }),
      new InputRule({
        find: MARKDOWN_LINK_INPUT_REGEX,
        handler: ({ state, range, match }) => {
          const label = match[1]?.trim();
          const href = sanitizeUrl(match[2] ?? "");

          if (!label || !href) {
            return null;
          }

          state.tr.insertText(label, range.from, range.to);
          state.tr.addMark(
            range.from,
            range.from + label.length,
            linkType.create({ href }),
          );
          state.tr.removeStoredMark(linkType);
        },
      }),
    ];
  },
});
