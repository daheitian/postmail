/**
 * Smart-paste plugin for embeds.
 *
 * Trigger conditions (intentionally narrow — Notion / Ghost behaviour):
 *   1. The clipboard payload is *just* a URL (no surrounding text).
 *   2. The current selection is collapsed inside an empty paragraph.
 *   3. The URL resolves to a known first-class provider (YouTube, Vimeo, …).
 *      Random https URLs do not auto-convert — they'd surprise authors and
 *      autolink is the safer default.
 *
 * Anything else falls through to `LinkInputRules` so existing autolink
 * behaviour is preserved.
 *
 * Undo behaviour: after auto-conversion, one Cmd/Ctrl+Z reverts to the URL
 * as a plain hyperlink (Notion / Ghost convention) so authors can opt out
 * without learning a new affordance. Implemented as two transactions with
 * an explicit history boundary in between.
 */

import { Extension } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { hasKnownProvider, resolveEmbed } from "../../lib/embed-providers.js";

const URL_ONLY_REGEX = /^https?:\/\/\S+$/i;

const embedPasteKey = new PluginKey("jantEmbedPaste");

export const EmbedPaste = Extension.create({
  name: "embedPaste",

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: embedPasteKey,
        props: {
          handlePaste(view, event) {
            const clipboard = event.clipboardData;
            if (!clipboard) return false;
            const text = clipboard.getData("text/plain")?.trim() ?? "";
            if (!text || !URL_ONLY_REGEX.test(text)) return false;

            // Selection must be collapsed inside an empty paragraph.
            const { selection } = view.state;
            if (!selection.empty) return false;
            const $from = selection.$from;
            const parent = $from.parent;
            if (parent.type.name !== "paragraph") return false;
            if (parent.content.size > 0) return false;

            if (!hasKnownProvider(text)) return false;

            const resolved = resolveEmbed(text);
            if (!resolved) return false;

            event.preventDefault();

            // Step 1: insert the URL as a linked text run. This is what one
            // Cmd+Z step will land on, giving authors a way to opt out of
            // the embed without any extra affordance.
            const linkType = view.state.schema.marks.link;
            const insertPos = $from.pos;
            const tr1 = view.state.tr.insertText(text, insertPos);
            if (linkType) {
              tr1.addMark(
                insertPos,
                insertPos + text.length,
                linkType.create({ href: text }),
              );
            }
            view.dispatch(tr1);

            // Step 2: in a separate history group, replace the linked text
            // with the embed node. `closeHistory` forces a new undo step so
            // the two transactions are not coalesced into one.
            queueMicrotask(() => {
              const start = insertPos;
              const end = insertPos + text.length;
              const tr2 = closeHistory(view.state.tr).delete(start, end);
              view.dispatch(tr2);
              editor.commands.setEmbed({ url: text });
            });

            return true;
          },
        },
      }),
    ];
  },
});
