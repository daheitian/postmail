/**
 * Tiptap Extension Configuration
 *
 * Shared extension set for all Tiptap editor instances (compose + post form).
 */

import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { ImageNode } from "./image-node.js";
import { MoreBreak } from "./more-break.js";
import { SlashCommands } from "./slash-commands.js";
import { PasteImage } from "./paste-image.js";
import { BubbleMenu } from "./bubble-menu.js";

export interface EditorExtensionOptions {
  placeholder?: string;
}

/**
 * Creates the standard Tiptap extension array.
 *
 * @param options - Configuration for extensions
 * @returns Configured extension array
 */
export function createEditorExtensions(
  options: EditorExtensionOptions = {},
): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Placeholder.configure({
      placeholder: options.placeholder ?? "Write something…",
    }),
    ImageNode,
    MoreBreak,
    SlashCommands,
    PasteImage,
    BubbleMenu,
  ];
}
