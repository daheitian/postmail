/**
 * Tiptap Editor Factory
 *
 * Creates configured Tiptap editor instances for use in Lit components.
 */

import { Editor, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import { createEditorExtensions } from "./extensions.js";
import { ImageNode } from "./image-node.js";
import { MoreBreak } from "./more-break.js";
import type { FormattingToolbarMode } from "./toolbar-mode.js";
import type { PasteMediaOptions } from "./paste-media.js";

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
      options.onUpdate?.(editor.getJSON());
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
  const editor = new Editor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: false },
      }),
      Markdown,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      ImageNode,
      MoreBreak,
    ],
    content: json,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const md = ((editor as any).storage.markdown.getMarkdown as () => string)();
  editor.destroy();
  return md;
}
