/**
 * Shared Footnote Helpers
 *
 * Keeps footnote label normalization, DOM ID generation, and Markdown
 * definition parsing consistent across the markdown parser, HTML renderer,
 * and editor schema.
 */

const FOOTNOTE_LABEL_FALLBACK = "footnote";
const FOOTNOTE_CONTINUATION_PREFIX = /^(?: {4}|\t)/;
const FOOTNOTE_DEFINITION_PREFIX = /^\[\^([^\]\n]+)\]:(.*)(?:\n|$)/;

export interface FootnoteDefinitionTokenData {
  label: string;
  raw: string;
  contentMarkdown: string;
}

export function normalizeFootnoteLabel(label: unknown): string {
  if (typeof label !== "string") return "";
  return label.trim().replace(/\s+/g, " ");
}

export function getFootnoteLabelKey(label: unknown): string {
  return normalizeFootnoteLabel(label).toLowerCase();
}

export function getFootnoteReferenceText(label: unknown): string {
  const normalized = normalizeFootnoteLabel(label);
  return `[^${normalized || FOOTNOTE_LABEL_FALLBACK}]`;
}

export function getFootnoteDefinitionLabelText(label: unknown): string {
  return `${getFootnoteReferenceText(label)}:`;
}

export function getFootnoteDomId(label: unknown): string {
  const normalized = getFootnoteLabelKey(label);
  const slug = normalized.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");

  return slug || FOOTNOTE_LABEL_FALLBACK;
}

export function indentFootnoteMarkdown(content: string): string {
  return content
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}

/**
 * Parses one Markdown footnote definition from the start of `src`.
 *
 * Supports:
 * - `[^1]: inline body`
 * - `[^1]:` followed by indented continuation blocks
 * - blank lines inside the definition when followed by indented content
 */
export function parseFootnoteDefinition(
  src: string,
): FootnoteDefinitionTokenData | null {
  const startMatch = src.match(FOOTNOTE_DEFINITION_PREFIX);
  if (!startMatch) return null;

  const label = normalizeFootnoteLabel(startMatch[1]);
  if (!label) return null;

  const bodyLines: string[] = [];
  const firstLineContent = (startMatch[2] ?? "").replace(/^ /, "");
  if (firstLineContent) {
    bodyLines.push(firstLineContent);
  }

  let raw = startMatch[0];
  let offset = raw.length;

  while (offset < src.length) {
    const rest = src.slice(offset);
    const lineMatch = rest.match(/^(.*)(\n|$)/);
    if (!lineMatch) break;

    const line = lineMatch[1] ?? "";
    const consumed = lineMatch[0];

    if (FOOTNOTE_CONTINUATION_PREFIX.test(line)) {
      bodyLines.push(line.replace(FOOTNOTE_CONTINUATION_PREFIX, ""));
      raw += consumed;
      offset += consumed.length;
      continue;
    }

    if (line.trim() === "") {
      const afterBlank = src.slice(offset + consumed.length);
      const nextLine = afterBlank.match(/^(.*)(?:\n|$)/)?.[1] ?? "";

      if (FOOTNOTE_CONTINUATION_PREFIX.test(nextLine)) {
        bodyLines.push("");
        raw += consumed;
        offset += consumed.length;
        continue;
      }
    }

    break;
  }

  return {
    label,
    raw,
    contentMarkdown: bodyLines.join("\n"),
  };
}
