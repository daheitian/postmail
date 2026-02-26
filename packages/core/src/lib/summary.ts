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
