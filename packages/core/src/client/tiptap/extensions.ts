/**
 * Tiptap Extension Configuration
 *
 * Shared extension set for all Tiptap editor instances (compose + post form).
 */

import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import { ImageNode } from "./image-node.js";
import { MoreBreak } from "./more-break.js";
import { SlashCommands } from "./slash-commands.js";
import { PasteImage } from "./paste-image.js";
import { BubbleMenu } from "./bubble-menu.js";
import { LinkToolbar } from "./link-toolbar.js";
import { ExitableMarks } from "./exitable-marks.js";

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
      link: { openOnClick: false, autolink: false },
    }),
    Placeholder.configure({
      placeholder: options.placeholder ?? "Write something…",
    }),
    Table.configure({
      resizable: false,
      HTMLAttributes: { class: "tiptap-table" },
    }),
    TableRow,
    TableCell,
    TableHeader,
    ImageNode,
    MoreBreak,
    SlashCommands,
    PasteImage,
    BubbleMenu,
    LinkToolbar,
    ExitableMarks,
  ];
}
