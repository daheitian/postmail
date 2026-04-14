/**
 * Shared Zola Markdown parsing utilities.
 *
 * Used by both the import-site CLI command and GitHub Sync to parse
 * Zola-format Markdown files with front matter and reply markers.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedFrontMatter {
  title?: string;
  date?: string;
  updated?: string;
  draft?: boolean;
  slug?: string;
  aliases?: string[];
  taxonomies?: { collections?: string[] };
  extra?: {
    format?: string;
    status?: string;
    visibility?: string;
    summary_text?: string;
    link_url?: string;
    source_name?: string;
    source_url?: string;
    quote_text?: string;
    rating?: number;
    pinned?: boolean;
    featured?: boolean;
    jant?: { root_aliases?: string[] };
  };
}

export interface ReplySegment {
  attrs: Record<string, string> | null;
  body: string;
}

// ---------------------------------------------------------------------------
// Front Matter
// ---------------------------------------------------------------------------

/**
 * Parse front matter from a Markdown file.
 * Supports both YAML (`---...---`) and TOML (`+++...+++`) delimiters.
 *
 * @param content - Raw file content
 * @returns Parsed front matter object and the remaining body text
 *
 * @example
 * ```ts
 * const { frontMatter, body } = await parseFrontMatter(fileContent);
 * console.log(frontMatter.slug, frontMatter.extra?.format);
 * ```
 */
export async function parseFrontMatter(
  content: string,
): Promise<{ frontMatter: ParsedFrontMatter; body: string }> {
  // Try YAML front matter (---...---)
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (yamlMatch) {
    const { parse } = await import("yaml");
    const frontMatter = (parse(yamlMatch[1]!) || {}) as ParsedFrontMatter;
    return { frontMatter, body: yamlMatch[2]! };
  }

  // Try TOML front matter (+++...+++)
  const tomlMatch = content.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n?([\s\S]*)$/);
  if (tomlMatch) {
    const { parse } = await import("smol-toml");
    const frontMatter = parse(tomlMatch[1]!) as ParsedFrontMatter;
    return { frontMatter, body: tomlMatch[2]! };
  }

  return { frontMatter: {} as ParsedFrontMatter, body: content };
}

// ---------------------------------------------------------------------------
// Reply Markers
// ---------------------------------------------------------------------------

/**
 * Split a post body into root and reply segments.
 *
 * Reply markers are HTML comments of the form:
 * `<!-- jant:reply date="..." slug="..." format="..." ... -->`
 *
 * The first segment has `attrs: null` and represents the root post body.
 * Subsequent segments carry the parsed marker attributes.
 *
 * @param body - Markdown body content (after front matter)
 * @returns Array of segments, root first
 *
 * @example
 * ```ts
 * const segments = splitReplies(body);
 * const root = segments[0]; // { attrs: null, body: "..." }
 * const replies = segments.slice(1); // [{ attrs: { slug: "...", ... }, body: "..." }]
 * ```
 */
export function splitReplies(body: string): ReplySegment[] {
  const markerRegex = /<!-- jant:reply (.*?) -->/g;

  const markers: Array<{
    index: number;
    endIndex: number;
    attrs: Record<string, string>;
  }> = [];
  let match: RegExpExecArray | null;
  while ((match = markerRegex.exec(body)) !== null) {
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(match[1]!)) !== null) {
      attrs[attrMatch[1]!] = attrMatch[2]!;
    }
    markers.push({
      index: match.index,
      endIndex: match.index + match[0].length,
      attrs,
    });
  }

  if (markers.length === 0) {
    return [{ attrs: null, body: body.trim() }];
  }

  const segments: ReplySegment[] = [];

  // Root segment: everything before the first marker
  segments.push({ attrs: null, body: body.slice(0, markers[0]!.index).trim() });

  // Reply segments: between consecutive markers
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i]!.endIndex;
    const end = i + 1 < markers.length ? markers[i + 1]!.index : body.length;
    segments.push({
      attrs: markers[i]!.attrs,
      body: body.slice(start, end).trim(),
    });
  }

  return segments;
}
