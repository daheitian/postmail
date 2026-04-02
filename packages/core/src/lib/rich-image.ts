import { escapeHtml } from "./html.js";
import { sanitizeUrl } from "./url.js";

export interface RichImageAttrs {
  src?: string;
  alt?: string;
  title?: string;
  caption?: string;
  href?: string;
  layout?: string;
}

interface NormalizedRichImageAttrs {
  src: string;
  alt: string;
  title: string;
  caption: string;
  href: string;
  layout: string;
}

function normalizeRichImageAttrs(
  attrs: RichImageAttrs,
): NormalizedRichImageAttrs {
  const layout =
    attrs.layout && String(attrs.layout) !== "regular"
      ? String(attrs.layout)
      : "regular";

  return {
    src: String(attrs.src ?? ""),
    alt: String(attrs.alt ?? ""),
    title: String(attrs.title ?? ""),
    caption: String(attrs.caption ?? ""),
    href: String(attrs.href ?? ""),
    layout,
  };
}

function renderRichImageBody(attrs: NormalizedRichImageAttrs): string {
  const imgAttrs = [`src="${escapeHtml(attrs.src)}"`];
  if (attrs.alt) imgAttrs.push(`alt="${escapeHtml(attrs.alt)}"`);
  if (attrs.title) imgAttrs.push(`title="${escapeHtml(attrs.title)}"`);

  const imgTag = `<img ${imgAttrs.join(" ")}>`;
  const href = attrs.href ? sanitizeUrl(attrs.href) : "";
  const content = href ? `<a href="${escapeHtml(href)}">${imgTag}</a>` : imgTag;
  const caption = attrs.caption
    ? `<figcaption>${escapeHtml(attrs.caption)}</figcaption>`
    : "";

  return `${content}${caption}`;
}

export function renderPublishedImageFigure(attrs: RichImageAttrs): string {
  const normalized = normalizeRichImageAttrs(attrs);
  const layoutAttr =
    normalized.layout !== "regular"
      ? ` data-layout="${escapeHtml(normalized.layout)}"`
      : "";

  return `<figure${layoutAttr}>${renderRichImageBody(normalized)}</figure>`;
}

export function renderMarkdownImageFigure(attrs: RichImageAttrs): string {
  const normalized = normalizeRichImageAttrs(attrs);
  const figureAttrs = ['data-jant-node="image"'];
  if (normalized.layout !== "regular") {
    figureAttrs.push(`data-jant-layout="${escapeHtml(normalized.layout)}"`);
  }

  return `<figure ${figureAttrs.join(" ")}>${renderRichImageBody(normalized)}</figure>`;
}

export function renderMarkdownImage(attrs: RichImageAttrs): string {
  const normalized = normalizeRichImageAttrs(attrs);

  if (
    normalized.caption ||
    normalized.href ||
    normalized.layout !== "regular"
  ) {
    return renderMarkdownImageFigure(normalized);
  }

  return normalized.title
    ? `![${normalized.alt}](${normalized.src} "${normalized.title}")`
    : `![${normalized.alt}](${normalized.src})`;
}
