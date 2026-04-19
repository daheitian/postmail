/**
 * Embed Provider Registry
 *
 * Hand-rolled URL-pattern matching for oEmbed-style third-party embeds.
 * Synchronous, no network calls — each entry declares a regex and a builder
 * that returns normalized iframe attrs plus any CSP sources the provider
 * needs. Unknown HTTPS URLs fall back to a sandboxed generic iframe.
 *
 * Why hand-rolled instead of fetching oembed.com's provider list:
 *   - most providers need sandbox/allow/aspect-ratio tuning the JSON list
 *     doesn't give us
 *   - network calls from Workers to third parties add latency and failure modes
 *   - the allowlist doubles as our CSP input — curated is safer
 *
 * To add a provider: append an entry to PROVIDERS. The first entry whose
 * regex matches wins.
 */

/**
 * Orientation hint for the rendered iframe wrapper.
 * `landscape` → 16:9; `portrait` → 9:16 (YouTube Shorts etc.);
 * `square` → 1:1; `auto` → provider-defined CSS, no aspect-ratio wrapper.
 */
export type EmbedOrientation = "landscape" | "portrait" | "square" | "auto";

export interface ResolvedEmbed {
  /** Provider id (e.g. "youtube"). Used for display + analytics. */
  provider: string;
  /** Human-readable provider name shown in the editor placeholder. */
  providerName: string;
  /** The final iframe `src`. Always absolute https. */
  src: string;
  /** Original URL the author pasted — kept for round-trip + noscript fallback. */
  url: string;
  /** Aspect ratio for the responsive wrapper. */
  orientation: EmbedOrientation;
  /**
   * Explicit height override in px. Only used for providers whose content
   * doesn't have a meaningful aspect ratio (Bandcamp, CodePen).
   */
  heightPx?: number;
  /** `sandbox` attribute value. */
  sandbox: string;
  /** `allow` attribute value (feature-policy). */
  allow?: string;
  /** CSP `frame-src` origins this provider needs. */
  cspFrameSrc: string[];
  /** CSP `script-src` origins this provider needs (for widgets.js etc.). */
  cspScriptSrc: string[];
}

interface ProviderMatcher {
  id: string;
  name: string;
  pattern: RegExp;
  build(match: RegExpMatchArray, url: URL): ResolvedEmbed | null;
}

const YOUTUBE_ORIGINS = ["https://www.youtube-nocookie.com"];
const VIMEO_ORIGINS = ["https://player.vimeo.com"];
const SPOTIFY_ORIGINS = ["https://open.spotify.com"];
const BANDCAMP_ORIGINS = ["https://bandcamp.com"];
const CODEPEN_ORIGINS = ["https://codepen.io"];

const DEFAULT_SANDBOX = "allow-scripts allow-same-origin allow-popups";
const MEDIA_SANDBOX =
  "allow-scripts allow-same-origin allow-popups allow-presentation";

function youtube(id: string, shorts: boolean, start?: number): ResolvedEmbed {
  const qs = start && start > 0 ? `?start=${start}` : "";
  return {
    provider: "youtube",
    providerName: "YouTube",
    src: `https://www.youtube-nocookie.com/embed/${id}${qs}`,
    url: "",
    orientation: shorts ? "portrait" : "landscape",
    sandbox: MEDIA_SANDBOX,
    allow:
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
    cspFrameSrc: YOUTUBE_ORIGINS,
    cspScriptSrc: [],
  };
}

function parseStartSeconds(raw: string | null): number | undefined {
  if (!raw) return undefined;
  // Bare integer (e.g. `t=42`). Use a strict digit check so we don't match
  // the leading number of a compound value like `1m30s`.
  if (/^\d+$/.test(raw)) {
    const asInt = Number.parseInt(raw, 10);
    return Number.isFinite(asInt) && asInt > 0 ? asInt : undefined;
  }
  // Compound form `t=1h2m3s` (any subset; trailing `s` optional).
  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!match) return undefined;
  const h = Number.parseInt(match[1] ?? "0", 10) || 0;
  const m = Number.parseInt(match[2] ?? "0", 10) || 0;
  const s = Number.parseInt(match[3] ?? "0", 10) || 0;
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : undefined;
}

const PROVIDERS: ProviderMatcher[] = [
  // YouTube: watch URL
  {
    id: "youtube",
    name: "YouTube",
    pattern:
      /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?=[^#]*v=([\w-]{6,}))/i,
    build: (m, url) => {
      const id = m[1];
      if (!id) return null;
      const start = parseStartSeconds(url.searchParams.get("t"));
      return youtube(id, false, start);
    },
  },
  // YouTube: shorts
  {
    id: "youtube",
    name: "YouTube",
    pattern:
      /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([\w-]{6,})/i,
    build: (m) => (m[1] ? youtube(m[1], true) : null),
  },
  // YouTube: youtu.be short link
  {
    id: "youtube",
    name: "YouTube",
    pattern: /^(?:https?:\/\/)?youtu\.be\/([\w-]{6,})/i,
    build: (m, url) => {
      const id = m[1];
      if (!id) return null;
      const start = parseStartSeconds(url.searchParams.get("t"));
      return youtube(id, false, start);
    },
  },
  // Vimeo
  {
    id: "vimeo",
    name: "Vimeo",
    pattern: /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)(?:\/(\w+))?/i,
    build: (m) => {
      const id = m[1];
      const hash = m[2];
      const suffix = hash ? `?h=${hash}` : "";
      return {
        provider: "vimeo",
        providerName: "Vimeo",
        src: `https://player.vimeo.com/video/${id}${suffix}`,
        url: "",
        orientation: "landscape",
        sandbox: MEDIA_SANDBOX,
        allow: "autoplay; fullscreen; picture-in-picture",
        cspFrameSrc: VIMEO_ORIGINS,
        cspScriptSrc: [],
      };
    },
  },
  // Spotify — open.spotify.com/{type}/{id}
  {
    id: "spotify",
    name: "Spotify",
    pattern:
      /^(?:https?:\/\/)?open\.spotify\.com\/(track|album|playlist|episode|show)\/([\w-]+)/i,
    build: (m) => {
      const type = m[1];
      const id = m[2];
      return {
        provider: "spotify",
        providerName: "Spotify",
        src: `https://open.spotify.com/embed/${type}/${id}`,
        url: "",
        orientation: "auto",
        heightPx: type === "track" || type === "episode" ? 152 : 352,
        sandbox: MEDIA_SANDBOX,
        allow:
          "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
        cspFrameSrc: SPOTIFY_ORIGINS,
        cspScriptSrc: [],
      };
    },
  },
  // Bandcamp — match track/album links of the form
  // https://{artist}.bandcamp.com/{track|album}/{slug}
  // The embed URL uses IDs which we can't derive from the public URL without
  // scraping. We fall back to bandcamp's generic URL-based embed, which works
  // via their "link your page" player and accepts album/track URLs directly.
  {
    id: "bandcamp",
    name: "Bandcamp",
    pattern:
      /^(?:https?:\/\/)?([a-z0-9-]+)\.bandcamp\.com\/(track|album)\/([\w-]+)/i,
    build: (_m, url) => {
      const encoded = encodeURIComponent(url.toString());
      return {
        provider: "bandcamp",
        providerName: "Bandcamp",
        src: `https://bandcamp.com/EmbeddedPlayer/v=2/linkcol=0687f5/tracklist=false/artwork=small/url=${encoded}`,
        url: "",
        orientation: "auto",
        heightPx: 120,
        sandbox: MEDIA_SANDBOX,
        cspFrameSrc: BANDCAMP_ORIGINS,
        cspScriptSrc: [],
      };
    },
  },
  // CodePen — codepen.io/{user}/pen/{id}
  {
    id: "codepen",
    name: "CodePen",
    pattern:
      /^(?:https?:\/\/)?codepen\.io\/([\w-]+)\/(?:pen|full|details)\/([\w-]+)/i,
    build: (m) => {
      const user = m[1];
      const id = m[2];
      return {
        provider: "codepen",
        providerName: "CodePen",
        src: `https://codepen.io/${user}/embed/${id}?default-tab=result&theme-id=default`,
        url: "",
        orientation: "auto",
        heightPx: 420,
        sandbox: DEFAULT_SANDBOX,
        cspFrameSrc: CODEPEN_ORIGINS,
        cspScriptSrc: [],
      };
    },
  },
];

/**
 * Resolve a raw URL into an embed descriptor. Returns `null` if the URL is
 * not a valid HTTPS/HTTP URL.
 *
 * Unknown-but-valid HTTPS URLs get a sandboxed generic iframe fallback so
 * the author can drop any embeddable page without us knowing about it.
 *
 * @param rawUrl - URL pasted or typed by the author
 * @returns ResolvedEmbed or null
 */
export function resolveEmbed(rawUrl: string): ResolvedEmbed | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    // Require absolute http/https; relative URLs are never embeddable.
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  for (const provider of PROVIDERS) {
    const match = trimmed.match(provider.pattern);
    if (match) {
      const resolved = provider.build(match, url);
      if (resolved) return { ...resolved, url: trimmed };
    }
  }

  // Generic iframe fallback — only allow https origins so we don't embed
  // insecure pages inside secure ones.
  if (url.protocol !== "https:") return null;

  return {
    provider: "iframe",
    providerName: url.hostname,
    src: url.toString(),
    url: trimmed,
    orientation: "landscape",
    sandbox: DEFAULT_SANDBOX,
    cspFrameSrc: [url.origin],
    cspScriptSrc: [],
  };
}

/**
 * Returns true if the given URL matches a known first-class provider
 * (i.e. not the generic iframe fallback). Used by smart-paste to decide
 * whether to convert a URL — we don't want to auto-convert random URLs
 * into iframes just because they're https.
 */
export function hasKnownProvider(rawUrl: string): boolean {
  const resolved = resolveEmbed(rawUrl);
  return resolved !== null && resolved.provider !== "iframe";
}
