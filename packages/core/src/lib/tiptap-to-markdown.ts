/**
 * Tiptap JSON → Markdown Converter
 *
 * Server-side converter that transforms Tiptap JSON documents to Markdown strings.
 * Pure string concatenation — no DOM required. Mirrors the node types
 * supported by `tiptap-render.ts`.
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
    const doc = JSON.parse(json) as TiptapNode;
    if (doc.type !== "doc") return "";
    return renderBlocks(doc.content ?? []).trimEnd();
  } catch {
    return "";
  }
}

function renderBlocks(nodes: TiptapNode[], indent = ""): string {
  const parts: string[] = [];

  for (const node of nodes) {
    const rendered = renderBlockNode(node, indent);
    if (rendered !== null) {
      parts.push(rendered);
    }
  }

  return parts.join("\n\n");
}

function renderBlockNode(node: TiptapNode, indent: string): string | null {
  switch (node.type) {
    case "paragraph": {
      const text = renderInline(node.content ?? []);
      return indent + text;
    }

    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6);
      const prefix = "#".repeat(level);
      const text = renderInline(node.content ?? []);
      return `${indent}${prefix} ${text}`;
    }

    case "bulletList":
      return renderList(node.content ?? [], indent, "bullet");

    case "orderedList": {
      const start = Number(node.attrs?.start ?? 1);
      return renderList(node.content ?? [], indent, "ordered", start);
    }

    case "blockquote": {
      const inner = renderBlocks(node.content ?? []);
      return inner
        .split("\n")
        .map((line) => indent + (line ? `> ${line}` : ">"))
        .join("\n");
    }

    case "codeBlock": {
      const lang = node.attrs?.language ? String(node.attrs.language) : "";
      const content = getPlainText(node.content ?? []);
      const fence = chooseFence(content);
      return `${indent}${fence}${lang}\n${content}\n${indent}${fence}`;
    }

    case "table":
      return renderTable(node.content ?? [], indent);

    case "horizontalRule":
      return `${indent}---`;

    case "hardBreak":
      return null;

    case "image": {
      const src = String(node.attrs?.src ?? "");
      const alt = node.attrs?.alt ? String(node.attrs.alt) : "";
      const title = node.attrs?.title ? String(node.attrs.title) : "";
      const titlePart = title ? ` "${title}"` : "";
      return `${indent}![${alt}](${src}${titlePart})`;
    }

    case "moreBreak":
      return `${indent}<!--more-->`;

    default:
      if (node.content) {
        return renderBlocks(node.content, indent);
      }
      return null;
  }
}

function renderList(
  items: TiptapNode[],
  indent: string,
  type: "bullet" | "ordered",
  start = 1,
): string {
  const lines: string[] = [];

  for (let i = 0; i < items.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- index-bounded loop
    const item = items[i]!;
    const marker = type === "bullet" ? "-" : `${(start + i).toString()}.`;
    const children = item.content ?? [];

    for (let j = 0; j < children.length; j++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- index-bounded loop
      const child = children[j]!;
      if (j === 0) {
        // First child gets the list marker
        if (child.type === "bulletList" || child.type === "orderedList") {
          // Nested list as first child — render with increased indent
          const nested = renderBlockNode(child, indent + "  ");
          if (nested !== null) {
            lines.push(`${indent}${marker} \n${nested}`);
          }
        } else {
          const text = renderInline(child.content ?? []);
          lines.push(`${indent}${marker} ${text}`);
        }
      } else {
        // Subsequent children: indent to align with first line content
        const childIndent = indent + " ".repeat(marker.length + 1);
        if (child.type === "bulletList" || child.type === "orderedList") {
          const nested = renderBlockNode(child, childIndent);
          if (nested !== null) lines.push(nested);
        } else if (child.type === "paragraph") {
          const text = renderInline(child.content ?? []);
          lines.push("");
          lines.push(`${childIndent}${text}`);
        } else {
          const rendered = renderBlockNode(child, childIndent);
          if (rendered !== null) {
            lines.push("");
            lines.push(rendered);
          }
        }
      }
    }
  }

  return lines.join("\n");
}

function renderTable(rows: TiptapNode[], indent: string): string {
  if (rows.length === 0) return "";

  const matrix: string[][] = [];

  for (const row of rows) {
    const cells: string[] = [];
    for (const cell of row.content ?? []) {
      // Each cell may contain paragraphs — render inline content
      const parts: string[] = [];
      for (const child of cell.content ?? []) {
        parts.push(renderInline(child.content ?? []));
      }
      cells.push(parts.join(" "));
    }
    matrix.push(cells);
  }

  // Calculate column widths
  const colCount = Math.max(...matrix.map((r) => r.length));
  const widths: number[] = [];
  for (let c = 0; c < colCount; c++) {
    widths.push(Math.max(3, ...matrix.map((r) => (r[c] ?? "").length)));
  }

  const lines: string[] = [];

  // Header row
  const headerRow = matrix[0] ?? [];
  lines.push(
    indent +
      "| " +
      widths.map((w, i) => (headerRow[i] ?? "").padEnd(w)).join(" | ") +
      " |",
  );

  // Separator row (first row is always the header)
  lines.push(
    indent + "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |",
  );

  // Body rows
  for (let r = 1; r < matrix.length; r++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- index-bounded loop
    const row = matrix[r]!;
    lines.push(
      indent +
        "| " +
        widths.map((w, i) => (row[i] ?? "").padEnd(w)).join(" | ") +
        " |",
    );
  }

  return lines.join("\n");
}

function renderInline(nodes: TiptapNode[]): string {
  return nodes.map(renderInlineNode).join("");
}

function renderInlineNode(node: TiptapNode): string {
  switch (node.type) {
    case "text": {
      let text = node.text ?? "";
      if (node.marks && node.marks.length > 0) {
        text = applyMarks(text, node.marks);
      }
      return text;
    }

    case "hardBreak":
      return "  \n";

    case "image": {
      const src = String(node.attrs?.src ?? "");
      const alt = node.attrs?.alt ? String(node.attrs.alt) : "";
      const title = node.attrs?.title ? String(node.attrs.title) : "";
      const titlePart = title ? ` "${title}"` : "";
      return `![${alt}](${src}${titlePart})`;
    }

    default:
      if (node.content) return renderInline(node.content);
      return "";
  }
}

function applyMarks(text: string, marks: TiptapMark[]): string {
  let result = text;

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = `**${result}**`;
        break;
      case "italic":
        result = `*${result}*`;
        break;
      case "strike":
        result = `~~${result}~~`;
        break;
      case "code":
        result = `\`${result}\``;
        break;
      case "link": {
        const href = String(mark.attrs?.href ?? "");
        result = `[${result}](${href})`;
        break;
      }
    }
  }

  return result;
}

function getPlainText(nodes: TiptapNode[]): string {
  return nodes.map((n) => n.text ?? "").join("");
}

function chooseFence(content: string): string {
  let count = 3;
  const regex = /(`{3,})/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const backticks = match[1] ?? "";
    if (backticks.length >= count) {
      count = backticks.length + 1;
    }
  }
  return "`".repeat(count);
}
