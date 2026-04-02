/**
 * TipTap JSON → HTML Renderer
 *
 * Renders TipTap JSON using explicit node and mark renderers so Markdown,
 * stored editor content, and summary extraction all share the same HTML rules.
 */

import type { JSONContent } from "@tiptap/core";
import { escapeHtml } from "./html.js";
import { renderPublishedImageFigure } from "./rich-image.js";
import { sanitizeUrl } from "./url.js";

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

interface RenderContext {
  renderChildren(content?: TiptapNode[]): string;
  renderNode(node: TiptapNode): string;
  renderText(text: string, marks?: TiptapMark[]): string;
}

type MarkRenderer = (html: string, mark: TiptapMark) => string;
type NodeRenderer = (node: TiptapNode, context: RenderContext) => string;

function getStringAttr(
  attrs: Record<string, unknown> | undefined,
  name: string,
): string {
  const value = attrs?.[name];
  return typeof value === "string" ? value : "";
}

function getNumberAttr(
  attrs: Record<string, unknown> | undefined,
  name: string,
): number | null {
  const value = attrs?.[name];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function renderCodeBlockText(node: TiptapNode): string {
  switch (node.type) {
    case "text":
      return escapeHtml(node.text ?? "");
    case "hardBreak":
      return "\n";
    default:
      return (node.content ?? []).map(renderCodeBlockText).join("");
  }
}

function renderTableCell(
  tagName: "td" | "th",
  node: TiptapNode,
  context: RenderContext,
): string {
  const colspan = getNumberAttr(node.attrs, "colspan");
  const rowspan = getNumberAttr(node.attrs, "rowspan");
  const colspanAttr =
    colspan !== null && colspan !== 1 ? ` colspan="${colspan}"` : "";
  const rowspanAttr =
    rowspan !== null && rowspan !== 1 ? ` rowspan="${rowspan}"` : "";

  return `<${tagName}${colspanAttr}${rowspanAttr}>${context.renderChildren(node.content)}</${tagName}>`;
}

const MARK_RENDERERS: Record<string, MarkRenderer> = {
  bold: (html) => `<strong>${html}</strong>`,
  italic: (html) => `<em>${html}</em>`,
  strike: (html) => `<s>${html}</s>`,
  code: (html) => `<code>${html}</code>`,
  link: (html, mark) => {
    const href = escapeHtml(sanitizeUrl(getStringAttr(mark.attrs, "href")));
    const target = getStringAttr(mark.attrs, "target");
    const targetAttr = target ? ` target="${escapeHtml(target)}"` : "";
    const relAttr = target ? ' rel="noopener noreferrer"' : "";

    return `<a href="${href}"${targetAttr}${relAttr}>${html}</a>`;
  },
};

const NODE_RENDERERS: Record<string, NodeRenderer> = {
  doc: (node, context) => context.renderChildren(node.content),
  paragraph: (node, context) =>
    `<p>${context.renderChildren(node.content)}</p>`,
  heading: (node, context) => {
    const level = Math.min(
      Math.max(getNumberAttr(node.attrs, "level") ?? 1, 1),
      6,
    );
    return `<h${level}>${context.renderChildren(node.content)}</h${level}>`;
  },
  text: (node, context) => context.renderText(node.text ?? "", node.marks),
  bulletList: (node, context) =>
    `<ul>${context.renderChildren(node.content)}</ul>`,
  orderedList: (node, context) => {
    const start = getNumberAttr(node.attrs, "start");
    const startAttr = start !== null && start !== 1 ? ` start="${start}"` : "";
    return `<ol${startAttr}>${context.renderChildren(node.content)}</ol>`;
  },
  listItem: (node, context) =>
    `<li>${context.renderChildren(node.content)}</li>`,
  blockquote: (node, context) =>
    `<blockquote>${context.renderChildren(node.content)}</blockquote>`,
  codeBlock: (node) => {
    const language = getStringAttr(node.attrs, "language");
    const languageAttr = language
      ? ` class="language-${escapeHtml(language)}"`
      : "";
    return `<pre><code${languageAttr}>${renderCodeBlockText(node)}</code></pre>`;
  },
  table: (node, context) =>
    `<table>${context.renderChildren(node.content)}</table>`,
  tableRow: (node, context) =>
    `<tr>${context.renderChildren(node.content)}</tr>`,
  tableCell: (node, context) => renderTableCell("td", node, context),
  tableHeader: (node, context) => renderTableCell("th", node, context),
  horizontalRule: () => "<hr>",
  hardBreak: () => "<br>",
  image: (node) => renderPublishedImageFigure(node.attrs ?? {}),
  moreBreak: () => "<!--more-->",
};

function renderText(text: string, marks: TiptapMark[] = []): string {
  let html = escapeHtml(text);

  for (const mark of marks) {
    const renderMark = MARK_RENDERERS[mark.type];
    if (renderMark) {
      html = renderMark(html, mark);
    }
  }

  return html;
}

function renderChildren(content: TiptapNode[] = []): string {
  return content.map(renderNode).join("");
}

function renderUnknownNode(node: TiptapNode, context: RenderContext): string {
  return node.content ? context.renderChildren(node.content) : "";
}

function renderNode(node: TiptapNode): string {
  const renderNodeType = NODE_RENDERERS[node.type] ?? renderUnknownNode;
  return renderNodeType(node, RENDER_CONTEXT);
}

const RENDER_CONTEXT: RenderContext = {
  renderChildren,
  renderNode,
  renderText,
};

/**
 * Renders a parsed TipTap document to HTML.
 *
 * @param doc - Parsed TipTap document
 * @returns HTML string
 */
export function renderTiptapDocument(doc: JSONContent): string {
  if (doc.type !== "doc") return "";
  return renderNode(doc as TiptapNode);
}

/**
 * Renders a Tiptap JSON document to an HTML string.
 *
 * @param json - Tiptap JSON string or parsed document object
 * @returns HTML string
 *
 * @example
 * ```ts
 * const html = renderTiptapJson('{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}');
 * // "<p>Hello</p>"
 * ```
 */
export function renderTiptapJson(json: string): string {
  try {
    const doc = JSON.parse(json) as JSONContent;
    return renderTiptapDocument(doc);
  } catch {
    return "";
  }
}
