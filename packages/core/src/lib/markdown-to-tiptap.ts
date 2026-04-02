/**
 * Markdown → TipTap JSON Conversion
 *
 * Converts Markdown strings to TipTap JSON documents using the official
 * Tiptap MarkdownManager and the same extension schema used elsewhere in Jant.
 */

import { parseMarkdownDocument } from "./markdown-manager.js";

/**
 * Converts a Markdown string to a TipTap JSON document string.
 *
 * @param markdown - Markdown source text
 * @returns Stringified TipTap JSON document
 *
 * @example
 * ```ts
 * const json = markdownToTiptapJson("Hello **world**");
 * // '{"type":"doc","content":[{"type":"paragraph","content":[...]}]}'
 * ```
 */
export function markdownToTiptapJson(markdown: string): string {
  return JSON.stringify(parseMarkdownDocument(markdown));
}
