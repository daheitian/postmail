/**
 * Summary Extraction from Tiptap JSON
 *
 * Extracts a plain-text summary from a Tiptap JSON document for use
 * in feeds, meta descriptions, and article previews.
 */

interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  marks?: unknown[];
  attrs?: Record<string, unknown>;
}

/**
 * Recursively extracts plain text from a Tiptap node, ignoring marks.
 */
function extractPlainText(node: TiptapNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (!node.content) return "";
  return node.content.map(extractPlainText).join("");
}

/**
 * Extracts a plain-text summary from a Tiptap JSON body string.
 *
 * Algorithm:
 * 1. If a `moreBreak` node is found, collect all paragraph text before it
 * 2. Otherwise, accumulate paragraph nodes until limits are reached
 * 3. Skip headings, images, code blocks, blockquotes, lists, horizontal rules
 *
 * @param bodyJson - Tiptap JSON string
 * @param maxParagraphs - Maximum number of paragraphs to include
 * @param maxChars - Maximum total character count
 * @returns Plain text summary, or null if no paragraphs found
 *
 * @example
 * ```ts
 * const summary = extractSummary(body, 5, 500);
 * ```
 */
/**
 * Content-bearing TipTap node types whose text should be indexed for search.
 * Block-level containers (bulletList, orderedList, table, etc.) are included
 * because they recurse into child nodes that carry text.
 */
const SEARCHABLE_TYPES = new Set([
  "doc",
  "paragraph",
  "heading",
  "codeBlock",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "text",
  "hardBreak",
]);

/**
 * Recursively extracts all searchable plain text from a TipTap JSON body string.
 *
 * Used for FTS indexing — includes text from paragraphs, headings, code blocks,
 * lists, blockquotes, and tables. Skips non-textual nodes (image, moreBreak,
 * horizontalRule). Block-level nodes are joined with spaces for better trigram
 * matching.
 *
 * @param bodyJson - TipTap JSON string (the `body` column)
 * @returns Plain text for FTS indexing, or null if parsing fails or doc is empty
 *
 * @example
 * ```ts
 * const text = extractBodyText(body);
 * // "Hello world Some code here"
 * ```
 */
export function extractBodyText(bodyJson: string): string | null {
  let doc: TiptapNode;
  try {
    doc = JSON.parse(bodyJson) as TiptapNode;
  } catch {
    return null;
  }

  if (doc.type !== "doc" || !doc.content) return null;

  function collectText(node: TiptapNode): string {
    if (!SEARCHABLE_TYPES.has(node.type)) return "";
    if (node.type === "text") return node.text ?? "";
    if (node.type === "hardBreak") return " ";
    if (!node.content) return "";
    return node.content.map(collectText).join(" ");
  }

  const parts: string[] = [];
  for (const child of doc.content) {
    const text = collectText(child).trim();
    if (text) parts.push(text);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

export function extractSummary(
  bodyJson: string,
  maxParagraphs: number,
  maxChars: number,
): string | null {
  let doc: TiptapNode;
  try {
    doc = JSON.parse(bodyJson) as TiptapNode;
  } catch {
    return null;
  }

  if (doc.type !== "doc" || !doc.content) return null;

  const nodes = doc.content;

  // Check for moreBreak — collect paragraph text before it
  const moreBreakIdx = nodes.findIndex((n) => n.type === "moreBreak");
  if (moreBreakIdx !== -1) {
    const paragraphs: string[] = [];
    for (let i = 0; i < moreBreakIdx; i++) {
      const node = nodes[i];
      if (!node) continue;
      if (node.type === "paragraph") {
        const text = extractPlainText(node).trim();
        if (text) paragraphs.push(text);
      }
    }
    return paragraphs.length > 0 ? paragraphs.join("\n\n") : null;
  }

  // No moreBreak — accumulate paragraphs up to limits
  const paragraphs: string[] = [];
  let totalChars = 0;

  for (const node of nodes) {
    if (node.type !== "paragraph") continue;

    const text = extractPlainText(node).trim();
    if (!text) continue;

    if (paragraphs.length >= maxParagraphs || totalChars >= maxChars) break;

    paragraphs.push(text);
    totalChars += text.length;
  }

  return paragraphs.length > 0 ? paragraphs.join("\n\n") : null;
}
