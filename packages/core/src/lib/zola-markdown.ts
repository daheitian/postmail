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
    jant?: {
      featured_at?: string | null;
      pinned_at?: string | null;
      root_aliases?: string[];
      collections?: {
        slug: string;
        collected_at?: string;
        position?: number;
        pinned_at?: string | null;
      }[];
    };
  };
}

/**
 * Structured reply metadata parsed from the JSON body of a
 * `<!--jant:reply ... -->` marker. Mirrors the `ReplyMeta` interface on
 * the export side. Every field is explicit about null vs undefined so
 * importers can distinguish "omitted" from "cleared".
 */
export interface ReplyMeta {
  date: string | null;
  slug: string;
  format: string;
  status: string;
  visibility: string;
  featured_at: string | null;
  pinned_at: string | null;
  rating: number | null;
  title: string | null;
  url: string | null;
  quote_text: string | null;
  source_name: string | null;
  source_url: string | null;
  collections: {
    slug: string;
    collected_at: string;
    position: number;
    pinned_at: string | null;
  }[];
}

export interface ReplySegment {
  attrs: ReplyMeta | null;
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
    const frontMatter = (parse(yamlMatch[1] ?? "") || {}) as ParsedFrontMatter;
    return { frontMatter, body: yamlMatch[2] ?? "" };
  }

  // Try TOML front matter (+++...+++)
  const tomlMatch = content.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n?([\s\S]*)$/);
  if (tomlMatch) {
    const { parse } = await import("smol-toml");
    const frontMatter = parse(tomlMatch[1] ?? "") as ParsedFrontMatter;
    return { frontMatter, body: tomlMatch[2] ?? "" };
  }

  return { frontMatter: {} as ParsedFrontMatter, body: content };
}

// ---------------------------------------------------------------------------
// Reply Markers
// ---------------------------------------------------------------------------

/**
 * Split a post body into root and reply segments.
 *
 * Reply markers are multi-line HTML comments wrapping a JSON payload:
 *
 * ```
 * <!--jant:reply
 * { "date": "...", "slug": "...", "format": "...", ... }
 * -->
 * ```
 *
 * The exporter defensively escapes any `-->` inside the JSON as
 * `--\u003e` before writing, so we reverse that on read (JSON's
 * `\u003e` escape parses back to `>` natively).
 *
 * The first segment has `attrs: null` and represents the root post body.
 * Subsequent segments carry the parsed `ReplyMeta`.
 *
 * @param body - Markdown body content (after front matter)
 * @returns Array of segments, root first
 *
 * @example
 * ```ts
 * const segments = splitReplies(body);
 * const root = segments[0]; // { attrs: null, body: "..." }
 * const replies = segments.slice(1); // [{ attrs: ReplyMeta, body: "..." }]
 * ```
 */
/**
 * Strip the optional visual decoration that the exporter emits before each
 * reply marker: a thematic break (`---`) followed by a `<time>` line.
 *
 * The decoration mirrors the Atom feed's thread rendering. It lives *before*
 * each reply marker, which means it ends up as trailing content on the
 * preceding segment's body. Stripping it here keeps re-import lossless.
 */
function stripTrailingReplyDecoration(segment: string): string {
  return segment.replace(/\n+---\s*\n+\s*<time\b[^>]*>[^<]*<\/time>\s*$/, "");
}

export function splitReplies(body: string): ReplySegment[] {
  const markerRegex = /<!--jant:reply\r?\n([\s\S]*?)\r?\n-->/g;

  const markers: Array<{
    index: number;
    endIndex: number;
    attrs: ReplyMeta;
  }> = [];
  let match: RegExpExecArray | null;
  while ((match = markerRegex.exec(body)) !== null) {
    const payload = match[1] ?? "";
    let parsed: ReplyMeta;
    try {
      parsed = JSON.parse(payload) as ReplyMeta;
    } catch (err) {
      throw new Error(
        `Failed to parse jant:reply marker JSON: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { cause: err },
      );
    }
    markers.push({
      index: match.index,
      endIndex: match.index + match[0].length,
      attrs: parsed,
    });
  }

  if (markers.length === 0) {
    return [{ attrs: null, body: body.trim() }];
  }

  const segments: ReplySegment[] = [];

  // Root segment: everything before the first marker
  segments.push({
    attrs: null,
    body: stripTrailingReplyDecoration(
      body.slice(0, (markers[0] as (typeof markers)[number]).index),
    ).trim(),
  });

  // Reply segments: between consecutive markers
  for (let i = 0; i < markers.length; i++) {
    const current = markers[i] as (typeof markers)[number];
    const next = markers[i + 1];
    const start = current.endIndex;
    const end = next ? next.index : body.length;
    const raw = body.slice(start, end);
    // Last segment has no following marker, so no trailing decoration to strip.
    const cleaned = next ? stripTrailingReplyDecoration(raw) : raw;
    segments.push({
      attrs: current.attrs,
      body: cleaned.trim(),
    });
  }

  return segments;
}
