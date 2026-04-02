/**
 * Tiptap Extension Configuration
 *
 * Shared extension set for all Tiptap editor instances (compose + post form).
 */

import type { Extensions } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { SlashCommands } from "./slash-commands.js";
import { PasteMedia } from "./paste-media.js";
import type { PasteMediaOptions } from "./paste-media.js";
import { BubbleMenu } from "./bubble-menu.js";
import { LinkToolbar } from "./link-toolbar.js";
import { ExitableMarks } from "./exitable-marks.js";
import { LinkInputRules } from "./link-input-rules.js";
import type { FormattingToolbarMode } from "./toolbar-mode.js";
import { ImageNode } from "./image-node.js";
import { MoreBreak } from "./more-break.js";
import { MarkdownClipboard } from "./markdown-clipboard.js";
import {
  MARKDOWN_MARKED_OPTIONS,
  createMarkdownContentExtensions,
} from "../../lib/markdown-manager.js";

export interface EditorExtensionOptions {
  placeholder?: string;
  toolbarMode?: FormattingToolbarMode;
  pasteMedia?: PasteMediaOptions;
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
    ...createMarkdownContentExtensions({
      imageExtension: ImageNode,
      moreBreakExtension: MoreBreak,
    }),
    Markdown.configure({
      markedOptions: MARKDOWN_MARKED_OPTIONS,
    }),
    Placeholder.configure({
      placeholder: options.placeholder ?? "Write something…",
    }),
    LinkInputRules,
    MarkdownClipboard,
    SlashCommands,
    PasteMedia.configure(options.pasteMedia ?? {}),
    BubbleMenu.configure({
      toolbarMode: options.toolbarMode ?? "default",
    }),
    LinkToolbar.configure({
      toolbarMode: options.toolbarMode ?? "default",
    }),
    ExitableMarks,
  ];
}
