/**
 * Markdown → TipTap JSON Conversion
 *
 * Converts Markdown strings to TipTap JSON documents using `marked.lexer()`
 * for tokenization. Enables the API to accept Markdown while the internal
 * pipeline (renderTiptapJson / extractBodyText / extractSummary) continues
 * to operate on TipTap JSON.
 */

import { marked, type Token, type Tokens } from "marked";

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
  attrs?: Record<string, unknown>;
}

/**
 * Converts a Markdown string to a TipTap JSON document string.
 *
 * Uses `marked.lexer()` to tokenize, then maps each token to the
 * corresponding TipTap node structure that `renderTiptapJson()` expects.
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
  const tokens = marked.lexer(markdown, { gfm: true, breaks: true });
  const content = tokens.flatMap(blockTokenToNodes);
  // Ensure at least one node so the doc is valid
  if (content.length === 0) {
    content.push({ type: "paragraph" });
  }
  const doc: TiptapNode = { type: "doc", content };
  return JSON.stringify(doc);
}

// ---------------------------------------------------------------------------
// Block-level token → TipTap node mapping
// ---------------------------------------------------------------------------

function blockTokenToNodes(token: Token): TiptapNode[] {
  switch (token.type) {
    case "paragraph":
      return [
        {
          type: "paragraph",
          content: inlineTokensToNodes(
            (token as Tokens.Paragraph).tokens ?? [],
            [],
          ),
        },
      ];

    // Tight list items use "text" instead of "paragraph" as the block wrapper
    case "text": {
      const t = token as Tokens.Text;
      return [
        {
          type: "paragraph",
          content: inlineTokensToNodes(t.tokens ?? [], []),
        },
      ];
    }

    case "heading": {
      const t = token as Tokens.Heading;
      return [
        {
          type: "heading",
          attrs: { level: t.depth },
          content: inlineTokensToNodes(t.tokens ?? [], []),
        },
      ];
    }

    case "code": {
      const t = token as Tokens.Code;
      const node: TiptapNode = {
        type: "codeBlock",
        content: [{ type: "text", text: t.text }],
      };
      if (t.lang) {
        node.attrs = { language: t.lang };
      }
      return [node];
    }

    case "blockquote": {
      const t = token as Tokens.Blockquote;
      const inner = (t.tokens ?? []).flatMap(blockTokenToNodes);
      return [{ type: "blockquote", content: inner }];
    }

    case "list": {
      const t = token as Tokens.List;
      const listType = t.ordered ? "orderedList" : "bulletList";
      const items = t.items.map(listItemToNode);
      const node: TiptapNode = { type: listType, content: items };
      if (t.ordered && t.start !== undefined && t.start !== 1) {
        node.attrs = { start: t.start };
      }
      return [node];
    }

    case "hr":
      return [{ type: "horizontalRule" }];

    case "html": {
      const t = token as Tokens.HTML;
      if (t.text.trim() === "<!--more-->") {
        return [{ type: "moreBreak" }];
      }
      // Other raw HTML: wrap in a paragraph as plain text
      return [
        {
          type: "paragraph",
          content: [{ type: "text", text: t.text.trim() }],
        },
      ];
    }

    case "table": {
      const t = token as Tokens.Table;
      const rows: TiptapNode[] = [];

      // Header row
      const headerCells = t.header.map(
        (cell): TiptapNode => ({
          type: "tableHeader",
          content: [
            {
              type: "paragraph",
              content: inlineTokensToNodes(cell.tokens, []),
            },
          ],
        }),
      );
      rows.push({ type: "tableRow", content: headerCells });

      // Body rows
      for (const row of t.rows) {
        const cells = row.map(
          (cell): TiptapNode => ({
            type: "tableCell",
            content: [
              {
                type: "paragraph",
                content: inlineTokensToNodes(cell.tokens, []),
              },
            ],
          }),
        );
        rows.push({ type: "tableRow", content: cells });
      }

      return [{ type: "table", content: rows }];
    }

    case "space":
      return [];

    default:
      return [];
  }
}

function listItemToNode(item: Tokens.ListItem): TiptapNode {
  // A list item's tokens can be block-level (loose list) or inline
  const children = (item.tokens ?? []).flatMap(blockTokenToNodes);
  return { type: "listItem", content: children };
}

// ---------------------------------------------------------------------------
// Inline token → TipTap node mapping (flattened marks model)
// ---------------------------------------------------------------------------

function inlineTokensToNodes(
  tokens: Token[],
  marks: TiptapMark[],
): TiptapNode[] {
  const nodes: TiptapNode[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "text": {
        const t = token as Tokens.Text;
        // marked may nest inline tokens inside text tokens
        if (t.tokens && t.tokens.length > 0) {
          nodes.push(...inlineTokensToNodes(t.tokens, marks));
        } else {
          const textNode: TiptapNode = { type: "text", text: t.text };
          if (marks.length > 0) textNode.marks = [...marks];
          nodes.push(textNode);
        }
        break;
      }

      case "strong": {
        const t = token as Tokens.Strong;
        const newMarks = [...marks, { type: "bold" }];
        nodes.push(...inlineTokensToNodes(t.tokens ?? [], newMarks));
        break;
      }

      case "em": {
        const t = token as Tokens.Em;
        const newMarks = [...marks, { type: "italic" }];
        nodes.push(...inlineTokensToNodes(t.tokens ?? [], newMarks));
        break;
      }

      case "codespan": {
        const t = token as Tokens.Codespan;
        const textNode: TiptapNode = { type: "text", text: t.text };
        textNode.marks = [...marks, { type: "code" }];
        nodes.push(textNode);
        break;
      }

      case "del": {
        const t = token as Tokens.Del;
        const newMarks = [...marks, { type: "strike" }];
        nodes.push(...inlineTokensToNodes(t.tokens ?? [], newMarks));
        break;
      }

      case "link": {
        const t = token as Tokens.Link;
        const linkMark: TiptapMark = {
          type: "link",
          attrs: { href: t.href, target: "_blank" },
        };
        const newMarks = [...marks, linkMark];
        nodes.push(...inlineTokensToNodes(t.tokens ?? [], newMarks));
        break;
      }

      case "image": {
        const t = token as Tokens.Image;
        const imgAttrs: Record<string, unknown> = { src: t.href };
        if (t.text) imgAttrs.alt = t.text;
        if (t.title) imgAttrs.title = t.title;
        const imgNode: TiptapNode = { type: "image", attrs: imgAttrs };
        nodes.push(imgNode);
        break;
      }

      case "br":
        nodes.push({ type: "hardBreak" });
        break;

      case "escape": {
        const t = token as Tokens.Escape;
        const textNode: TiptapNode = { type: "text", text: t.text };
        if (marks.length > 0) textNode.marks = [...marks];
        nodes.push(textNode);
        break;
      }

      default:
        // For any unhandled inline token with raw text, emit as text
        if ("text" in token && typeof token.text === "string") {
          const textNode: TiptapNode = { type: "text", text: token.text };
          if (marks.length > 0) textNode.marks = [...marks];
          nodes.push(textNode);
        }
        break;
    }
  }

  return nodes;
}
