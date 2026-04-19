/**
 * Embed Server Renderer
 *
 * Turns a `ResolvedEmbed` into the published HTML. The output is a
 * `<figure class="tiptap-embed-figure">` containing the iframe wrapped in an
 * aspect-ratio container. A `<noscript>`-style fallback link is always
 * included so RSS-stripped versions and JS-disabled visitors still see the
 * source URL.
 *
 * The same shape is also produced by `renderEmbedFromAttrs` when called
 * from `tiptap-render.ts` against persisted node attrs — old posts keep
 * rendering even if a provider entry is later removed, because attrs hold
 * the resolved `src` directly.
 */

import { escapeHtml } from "./html.js";
import { resolveEmbed, type ResolvedEmbed } from "./embed-providers.js";
import { sanitizeUrl } from "./url.js";

interface EmbedNodeAttrs {
  url?: unknown;
  src?: unknown;
  provider?: unknown;
  providerName?: unknown;
  orientation?: unknown;
  heightPx?: unknown;
  sandbox?: unknown;
  allow?: unknown;
  caption?: unknown;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildIframeHtml(embed: ResolvedEmbed): string {
  const safeSrc = escapeHtml(sanitizeUrl(embed.src));
  if (!safeSrc) return "";

  const sandbox = ` sandbox="${escapeHtml(embed.sandbox)}"`;
  const allowAttr = embed.allow ? ` allow="${escapeHtml(embed.allow)}"` : "";
  const titleAttr = ` title="${escapeHtml(embed.providerName)} embed"`;
  const loading = ` loading="lazy"`;
  const referrer = ` referrerpolicy="strict-origin-when-cross-origin"`;
  const allowFs = ` allowfullscreen`;

  return `<iframe src="${safeSrc}"${titleAttr}${sandbox}${allowAttr}${loading}${referrer}${allowFs}></iframe>`;
}

function wrapperAttrs(embed: ResolvedEmbed): string {
  const orientation =
    embed.orientation === "portrait"
      ? "portrait"
      : embed.orientation === "square"
        ? "square"
        : embed.orientation === "auto"
          ? "auto"
          : "landscape";
  const styleParts: string[] = [];
  if (embed.heightPx && embed.heightPx > 0) {
    styleParts.push(`--tiptap-embed-height:${Math.round(embed.heightPx)}px`);
  }
  const styleAttr =
    styleParts.length > 0 ? ` style="${escapeHtml(styleParts.join(";"))}"` : "";
  return ` data-orientation="${escapeHtml(orientation)}"${styleAttr}`;
}

/**
 * Render a fully-resolved embed (provider already known) to published HTML.
 */
export function renderEmbedFigure(
  embed: ResolvedEmbed,
  caption?: string,
): string {
  const iframe = buildIframeHtml(embed);
  if (!iframe) return "";

  const fallbackHref = escapeHtml(sanitizeUrl(embed.url || embed.src));
  const fallbackHost = escapeHtml(embed.providerName);
  const fallback = fallbackHref
    ? `<a class="tiptap-embed-fallback" href="${fallbackHref}" target="_blank" rel="noopener noreferrer">${fallbackHost} →</a>`
    : "";

  const provider = escapeHtml(embed.provider);
  const captionHtml = caption?.trim()
    ? `<figcaption>${escapeHtml(caption.trim())}</figcaption>`
    : "";

  return (
    `<figure class="tiptap-embed-figure" data-provider="${provider}"${wrapperAttrs(embed)}>` +
    `<div class="tiptap-embed-frame">${iframe}</div>` +
    fallback +
    captionHtml +
    `</figure>`
  );
}

/**
 * Render an `embed` TipTap node from its persisted attrs. Falls back to the
 * provider table when the node only stores a URL (e.g. round-tripped from
 * markdown), but trusts the persisted `src` when present so old posts render
 * even after a provider is removed.
 */
export function renderEmbedFromAttrs(
  attrs: Record<string, unknown> | undefined,
): string {
  const safe = (attrs ?? {}) as EmbedNodeAttrs;
  const url = asString(safe.url);
  const persistedSrc = asString(safe.src);

  let embed: ResolvedEmbed | null = null;

  if (persistedSrc) {
    const sanitized = sanitizeUrl(persistedSrc);
    if (sanitized) {
      embed = {
        provider: asString(safe.provider) || "iframe",
        providerName: asString(safe.providerName) || "Embed",
        src: sanitized,
        url: url || sanitized,
        orientation:
          (asString(safe.orientation) as ResolvedEmbed["orientation"]) ||
          "landscape",
        heightPx: asNumber(safe.heightPx) ?? undefined,
        sandbox:
          asString(safe.sandbox) ||
          "allow-scripts allow-same-origin allow-popups",
        allow: asString(safe.allow) || undefined,
        cspFrameSrc: [],
        cspScriptSrc: [],
      };
    }
  }

  if (!embed && url) {
    embed = resolveEmbed(url);
  }

  if (!embed) {
    if (!url) return "";
    const safeHref = escapeHtml(sanitizeUrl(url));
    if (!safeHref) return "";
    return `<p class="tiptap-embed-fallback"><a href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeHref}</a></p>`;
  }

  return renderEmbedFigure(embed, asString(safe.caption));
}
