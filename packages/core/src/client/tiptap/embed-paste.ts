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
 */

import { Extension } from "@tiptap/core";
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
            editor.commands.setEmbed({ url: text });
            return true;
          },
        },
      }),
    ];
  },
});
