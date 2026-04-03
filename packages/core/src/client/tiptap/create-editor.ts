/**
 * Tiptap Editor Factory
 *
 * Creates configured Tiptap editor instances for use in Lit components.
 */

import { Editor, type JSONContent } from "@tiptap/core";
import { createEditorExtensions } from "./extensions.js";
import type { FormattingToolbarMode } from "./toolbar-mode.js";
import type { PasteMediaOptions } from "./paste-media.js";
import { normalizeFootnoteArtifacts } from "../../lib/footnotes.js";
import { tiptapJsonToMarkdown } from "../../lib/tiptap-to-markdown.js";

export interface CreateEditorOptions {
  element: HTMLElement;
  placeholder?: string;
  content?: JSONContent | null;
  onUpdate?: (json: JSONContent) => void;
  onFocus?: () => void;
  onSelectionUpdate?: (selection: { from: number; to: number }) => void;
  toolbarMode?: FormattingToolbarMode;
  pasteMedia?: PasteMediaOptions;
}

/**
 * Creates a Tiptap editor instance with the standard extension set.
 *
 * @param options - Editor configuration
 * @returns Tiptap Editor instance
 */
export function createTiptapEditor(options: CreateEditorOptions): Editor {
  const editor = new Editor({
    element: options.element,
    extensions: createEditorExtensions({
      placeholder: options.placeholder,
      toolbarMode: options.toolbarMode,
      pasteMedia: options.pasteMedia,
    }),
    content: options.content ?? undefined,
    editorProps: {
      scrollMargin: { top: 5, right: 5, bottom: 80, left: 5 },
      scrollThreshold: { top: 5, right: 5, bottom: 80, left: 5 },
    },
    onUpdate: ({ editor }) => {
      options.onUpdate?.(normalizeFootnoteArtifacts(editor.getJSON()));
    },
    onFocus: () => {
      options.onFocus?.();
    },
    onSelectionUpdate: ({ editor }) => {
      options.onSelectionUpdate?.({
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      });
    },
  });

  return editor;
}

/**
 * Converts TipTap JSON content to Markdown using a headless editor.
 *
 * @param json - TipTap JSONContent
 * @returns Markdown string
 *
 * @example
 * const md = jsonToMarkdown({ type: "doc", content: [...] });
 */
export function jsonToMarkdown(json: JSONContent): string {
  return tiptapJsonToMarkdown(JSON.stringify(json));
}
