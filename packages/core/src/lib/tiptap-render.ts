/**
 * Tiptap JSON → HTML Renderer
 *
 * Lightweight server-side renderer that converts Tiptap JSON documents
 * to HTML strings. Pure string concatenation — no DOM required.
 * Works on Cloudflare Workers and any JS runtime.
 */

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarks(text: string, marks: TiptapMark[]): string {
  let result = escapeHtml(text);

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = `<strong>${result}</strong>`;
        break;
      case "italic":
        result = `<em>${result}</em>`;
        break;
      case "strike":
        result = `<s>${result}</s>`;
        break;
      case "code":
        result = `<code>${result}</code>`;
        break;
      case "link": {
        const href = escapeHtml(String(mark.attrs?.href ?? ""));
        const target = mark.attrs?.target
          ? ` target="${escapeHtml(String(mark.attrs.target))}"`
          : "";
        const rel = mark.attrs?.target
          ? ' rel="noopener noreferrer nofollow"'
          : "";
        result = `<a href="${href}"${target}${rel}>${result}</a>`;
        break;
      }
    }
  }

  return result;
}

function renderNode(node: TiptapNode): string {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(renderNode).join("");

    case "paragraph":
      return `<p>${renderChildren(node)}</p>`;

    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6);
      return `<h${level}>${renderChildren(node)}</h${level}>`;
    }

    case "text":
      if (node.marks && node.marks.length > 0) {
        return renderMarks(node.text ?? "", node.marks);
      }
      return escapeHtml(node.text ?? "");

    case "bulletList":
      return `<ul>${renderChildren(node)}</ul>`;

    case "orderedList": {
      const start = node.attrs?.start;
      const startAttr = start && start !== 1 ? ` start="${start}"` : "";
      return `<ol${startAttr}>${renderChildren(node)}</ol>`;
    }

    case "listItem":
      return `<li>${renderChildren(node)}</li>`;

    case "blockquote":
      return `<blockquote>${renderChildren(node)}</blockquote>`;

    case "codeBlock": {
      const lang = node.attrs?.language;
      const langClass = lang
        ? ` class="language-${escapeHtml(String(lang))}"`
        : "";
      return `<pre><code${langClass}>${renderChildren(node)}</code></pre>`;
    }

    case "horizontalRule":
      return "<hr>";

    case "hardBreak":
      return "<br>";

    case "image": {
      const src = escapeHtml(String(node.attrs?.src ?? ""));
      const alt = node.attrs?.alt
        ? ` alt="${escapeHtml(String(node.attrs.alt))}"`
        : "";
      const title = node.attrs?.title
        ? ` title="${escapeHtml(String(node.attrs.title))}"`
        : "";
      return `<img src="${src}"${alt}${title}>`;
    }

    case "moreBreak":
      return "<!--more-->";

    default:
      // Unknown node: render children if any, skip otherwise
      return node.content ? renderChildren(node) : "";
  }
}

function renderChildren(node: TiptapNode): string {
  return (node.content ?? []).map(renderNode).join("");
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
    const doc = JSON.parse(json) as TiptapNode;
    if (doc.type !== "doc") return "";
    return renderNode(doc);
  } catch {
    return "";
  }
}
