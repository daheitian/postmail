import type { Post } from "../types.js";
import { extractDisplayDomain } from "./url.js";

const TITLE_MAX_CHARS = 72;
const DESCRIPTION_MAX_CHARS = 160;

function normalizeText(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function getFirstParagraph(text: string | null | undefined): string {
  const normalized = (text ?? "")
    .split(/\n\s*\n/)
    .map((part) => normalizeText(part))
    .find((part) => part.length > 0);
  return normalized ?? "";
}

function clipText(text: string, maxChars: number): string {
  const normalized = normalizeText(text);
  if (normalized.length <= maxChars) return normalized;

  const slice = normalized.slice(0, maxChars - 3);
  const lastSpace = slice.lastIndexOf(" ");
  const clipped =
    lastSpace >= Math.floor((maxChars - 3) * 0.6)
      ? slice.slice(0, lastSpace)
      : slice;

  return `${clipped.trimEnd()}...`;
}

function getTitleCandidate(post: Post): string {
  if (post.format === "quote") {
    const quoteSnippet = getFirstParagraph(post.quoteText);
    const attribution = normalizeText(
      post.title ||
        (post.url ? extractDisplayDomain(post.url) || post.url : ""),
    );

    if (quoteSnippet && attribution) {
      return clipText(`${quoteSnippet} - ${attribution}`, TITLE_MAX_CHARS);
    }
    if (quoteSnippet) return clipText(quoteSnippet, TITLE_MAX_CHARS);
  }

  if (normalizeText(post.title)) return normalizeText(post.title);

  const summarySnippet = getFirstParagraph(post.summary);
  if (summarySnippet) return clipText(summarySnippet, TITLE_MAX_CHARS);

  const bodySnippet = getFirstParagraph(post.bodyText);
  if (bodySnippet) return clipText(bodySnippet, TITLE_MAX_CHARS);

  if (post.format === "link" && post.url) {
    return extractDisplayDomain(post.url) || post.url;
  }

  return "";
}

function getDescriptionCandidate(post: Post): string {
  if (post.format === "quote") {
    const quoteText = normalizeText(post.quoteText);
    if (quoteText) return clipText(quoteText, DESCRIPTION_MAX_CHARS);
  }

  const summaryText = normalizeText(post.summary);
  if (summaryText) return clipText(summaryText, DESCRIPTION_MAX_CHARS);

  const bodyText = normalizeText(post.bodyText);
  if (bodyText) return clipText(bodyText, DESCRIPTION_MAX_CHARS);

  const quoteText = normalizeText(post.quoteText);
  if (quoteText) return clipText(quoteText, DESCRIPTION_MAX_CHARS);

  if (post.url) return clipText(post.url, DESCRIPTION_MAX_CHARS);

  return "";
}

export interface PostMeta {
  title: string;
  description?: string;
}

export function buildPostMeta(post: Post, siteName: string): PostMeta {
  const derivedTitle = getTitleCandidate(post);
  const derivedDescription = getDescriptionCandidate(post);

  return {
    title: derivedTitle || siteName,
    description: derivedDescription || undefined,
  };
}
