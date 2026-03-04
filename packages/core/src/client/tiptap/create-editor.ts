/**
 * Tiptap Editor Factory
 *
 * Creates configured Tiptap editor instances for use in Lit components.
 */

import { Editor, type JSONContent } from "@tiptap/core";
import { createEditorExtensions } from "./extensions.js";

export interface CreateEditorOptions {
  element: HTMLElement;
  placeholder?: string;
  content?: JSONContent | null;
  onUpdate?: (json: JSONContent) => void;
  onFocus?: () => void;
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
  });

  return editor;
}
