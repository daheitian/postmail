/**
 * Tiptap JSON → Markdown Converter
 *
 * Converts Tiptap JSON documents to Markdown using the official
 * Tiptap MarkdownManager and Jant's shared markdown schema.
 */

import type { JSONContent } from "@tiptap/core";
import { serializeMarkdownDocument } from "./markdown-manager.js";

/**
 * Converts a Tiptap JSON document to a Markdown string.
 *
 * @param json - Tiptap JSON string or parsed document object
 * @returns Markdown string
 *
 * @example
 * ```ts
 * const md = tiptapJsonToMarkdown('{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}');
 * // "Hello"
 * ```
 */
export function tiptapJsonToMarkdown(json: string): string {
  try {
    const doc = JSON.parse(json) as JSONContent;
    if (doc.type !== "doc") return "";
    return serializeMarkdownDocument(doc).trimEnd();
  } catch {
    return "";
  }
}
