/**
 * Telegram message entities → CommonMark.
 *
 * Telegram clients ship rich text as a plain `text` string plus an `entities`
 * array of `{type, offset, length}` spans. Jant stores post bodies as
 * CommonMark, so the webhook needs to fold the entity styling back into the
 * text before saving.
 *
 * Two design choices worth knowing:
 *
 * 1. **Top-level text passes through verbatim**, so anything the user typed as
 *    literal markdown (`**foo**`, `# Heading`, …) lands in the post unchanged.
 *    Only text *inside* an entity span is markdown-escaped, because that text
 *    is then wrapped in delimiters and we don't want stray `*` / `_` / `` ` ``
 *    to break out of the styled span.
 * 2. **Unsupported entity types degrade to plain text** rather than throwing.
 *    Underline, spoiler, custom emoji, and the auto-detected `url` /
 *    `hashtag` / `mention` family have no CommonMark equivalent that adds
 *    information beyond the raw text — markdown auto-links bare URLs anyway.
 *
 * Telegram offsets are UTF-16 code units, which is exactly what JavaScript
 * string indexing uses, so no transcoding is needed.
 */

import type { TelegramMessageEntity } from "./telegram.js";

interface EntityNode {
  entity: TelegramMessageEntity;
  children: EntityNode[];
}

/**
 * Converts a Telegram message's `text` + `entities` into CommonMark.
 *
 * @param text - The raw `message.text` (or `message.caption`)
 * @param entities - The parallel `message.entities` array, may be empty
 * @returns The text rewritten as CommonMark; unchanged when `entities` is empty
 * @example
 * entitiesToMarkdown("hello world", [
 *   { type: "bold", offset: 6, length: 5 },
 * ]); // "hello **world**"
 */
export function entitiesToMarkdown(
  text: string,
  entities: TelegramMessageEntity[] | undefined,
): string {
  if (!entities || entities.length === 0) return text;
  const roots = buildTree(entities);
  return renderRoots(text, roots);
}

/**
 * Groups entities into a forest by containment.
 *
 * Telegram guarantees entities are either nested or disjoint — they never
 * partially overlap — so a simple "find the nearest enclosing entity" pass is
 * enough to recover the tree.
 */
function buildTree(entities: TelegramMessageEntity[]): EntityNode[] {
  // Sort parents before children: earlier start first, and for ties the
  // longer (containing) span first.
  const sorted = [...entities].sort(
    (a, b) => a.offset - b.offset || b.length - a.length,
  );
  const nodes: EntityNode[] = sorted.map((entity) => ({
    entity,
    children: [],
  }));
  const roots: EntityNode[] = [];
  for (const [i, node] of nodes.entries()) {
    const nodeEnd = node.entity.offset + node.entity.length;
    let parent: EntityNode | null = null;
    // Walk previously-processed nodes from latest to earliest so we land on
    // the smallest ancestor that still strictly contains this entity.
    for (const cand of nodes.slice(0, i).reverse()) {
      const candEnd = cand.entity.offset + cand.entity.length;
      if (cand.entity.offset <= node.entity.offset && candEnd >= nodeEnd) {
        parent = cand;
        break;
      }
    }
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function renderRoots(text: string, roots: EntityNode[]): string {
  return renderRange(text, 0, text.length, roots, { escapeGaps: false });
}

/**
 * Emits the substring `[start, end)` from `text`, splicing in rendered child
 * entities and (optionally) escaping the gaps between them.
 *
 * @param escapeGaps - True when this range is itself inside an entity span,
 * so any stray markdown chars would otherwise leak out of the wrapping
 * delimiters. False at the top level so user-typed markdown is preserved.
 */
function renderRange(
  text: string,
  start: number,
  end: number,
  children: EntityNode[],
  options: { escapeGaps: boolean },
): string {
  const sorted = [...children].sort(
    (a, b) => a.entity.offset - b.entity.offset,
  );
  let out = "";
  let cursor = start;
  for (const child of sorted) {
    if (child.entity.offset > cursor) {
      const gap = text.slice(cursor, child.entity.offset);
      out += options.escapeGaps ? escapeInline(gap) : gap;
    }
    out += renderNode(text, child);
    cursor = child.entity.offset + child.entity.length;
  }
  if (cursor < end) {
    const tail = text.slice(cursor, end);
    out += options.escapeGaps ? escapeInline(tail) : tail;
  }
  return out;
}

function renderNode(text: string, node: EntityNode): string {
  const { entity, children } = node;
  const spanStart = entity.offset;
  const spanEnd = entity.offset + entity.length;
  const raw = text.slice(spanStart, spanEnd);

  switch (entity.type) {
    case "bold":
      return `**${renderInline(text, spanStart, spanEnd, children)}**`;
    case "italic":
      // `*` is safer than `_` because underscores inside words don't trigger
      // emphasis in CommonMark.
      return `*${renderInline(text, spanStart, spanEnd, children)}*`;
    case "strikethrough":
      return `~~${renderInline(text, spanStart, spanEnd, children)}~~`;
    case "code":
      return wrapInlineCode(raw);
    case "pre":
      return wrapCodeBlock(raw, entity.language);
    case "text_link":
      return renderTextLink(text, spanStart, spanEnd, children, entity.url);
    case "blockquote":
    case "expandable_blockquote":
      return renderBlockquote(text, spanStart, spanEnd, children);
    // Everything else (url, mention, hashtag, cashtag, bot_command, email,
    // phone_number, text_mention, custom_emoji, underline, spoiler, …) has
    // no clean CommonMark mapping or adds nothing over the plain text.
    default:
      return renderInline(text, spanStart, spanEnd, children);
  }
}

function renderInline(
  text: string,
  start: number,
  end: number,
  children: EntityNode[],
): string {
  return renderRange(text, start, end, children, { escapeGaps: true });
}

function renderTextLink(
  text: string,
  start: number,
  end: number,
  children: EntityNode[],
  url: string | undefined,
): string {
  const label = renderInline(text, start, end, children);
  if (!url) return label;
  return `[${label.replace(/[\\\]]/g, "\\$&")}](${escapeLinkUrl(url)})`;
}

function renderBlockquote(
  text: string,
  start: number,
  end: number,
  children: EntityNode[],
): string {
  const inner = renderInline(text, start, end, children);
  return inner
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

/**
 * Wraps content in the shortest backtick fence that doesn't collide with a
 * backtick run already present in the content. Required for any `code` span
 * containing backticks.
 */
function wrapInlineCode(content: string): string {
  const longestRun = longestBacktickRun(content);
  const fence = "`".repeat(longestRun + 1);
  // CommonMark: a space pads the content when it would otherwise start or
  // end with a backtick.
  const pad = content.startsWith("`") || content.endsWith("`") ? " " : "";
  return `${fence}${pad}${content}${pad}${fence}`;
}

function wrapCodeBlock(content: string, language: string | undefined): string {
  const fenceLen = Math.max(3, longestBacktickRun(content) + 1);
  const fence = "`".repeat(fenceLen);
  const lang = language ? language : "";
  return `${fence}${lang}\n${content}\n${fence}`;
}

function longestBacktickRun(s: string): number {
  let max = 0;
  const matches = s.match(/`+/g);
  if (!matches) return 0;
  for (const m of matches) {
    if (m.length > max) max = m.length;
  }
  return max;
}

/**
 * Escapes the markdown delimiters that would otherwise let the inner text
 * break out of a styled span. We deliberately escape only the characters that
 * carry inline meaning here — `*`, `_`, `` ` ``, `~`, `[`, `]`, `\` — rather
 * than the full CommonMark punctuation set, so emoji-adjacent punctuation and
 * other harmless characters stay readable.
 */
function escapeInline(s: string): string {
  return s.replace(/[\\`*_~[\]]/g, "\\$&");
}

function escapeLinkUrl(url: string): string {
  return url.replace(/[\\()]/g, "\\$&");
}
