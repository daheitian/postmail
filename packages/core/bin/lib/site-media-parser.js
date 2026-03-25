import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { parseFragment } from "parse5";
import { visit } from "unist-util-visit";

const URL_SCHEMES_TO_SKIP = ["data:", "mailto:", "tel:", "javascript:", "#"];
const MEDIA_FILE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
  ".ico",
  ".bmp",
  ".mp4",
  ".webm",
  ".mov",
  ".mp3",
  ".ogg",
  ".wav",
  ".m4a",
  ".flac",
  ".aac",
  ".pdf",
  ".json",
  ".txt",
  ".csv",
  ".md",
]);

function parseMarkdown(content) {
  return fromMarkdown(content, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
}

function getStartOffset(node) {
  return node?.position?.start?.offset;
}

function getEndOffset(node) {
  return node?.position?.end?.offset;
}

function getAttribute(node, name) {
  const attr = Array.isArray(node?.attrs)
    ? node.attrs.find((candidate) => candidate.name === name)
    : null;
  return attr?.value ?? null;
}

function getHtmlChildText(node) {
  if (!Array.isArray(node?.childNodes)) {
    return "";
  }

  return node.childNodes
    .filter((child) => child.nodeName === "#text" && typeof child.value === "string")
    .map((child) => child.value)
    .join("");
}

function isWhitespaceHtmlNode(node) {
  return node.nodeName === "#text" && typeof node.value === "string"
    ? node.value.trim() === ""
    : false;
}

function isAttachmentRoot(node) {
  return (
    node?.tagName === "div" &&
    getAttribute(node, "data-jant-node") === "attachments"
  );
}

function isAttachmentFigure(node) {
  return (
    node?.tagName === "figure" &&
    getAttribute(node, "data-jant-node") === "attachment"
  );
}

function hasDataJantMetaAttribute(node) {
  return Array.isArray(node?.attrs)
    ? node.attrs.some((attr) => attr.name === "data-jant-meta" || attr.name.startsWith("data-jant-meta"))
    : false;
}

function walkHtml(node, visitor, state = { inAttachmentFigure: false }) {
  if (!node) {
    return;
  }

  const nextState = {
    ...state,
    inAttachmentFigure: state.inAttachmentFigure || isAttachmentFigure(node),
  };
  visitor(node, nextState);

  if (!Array.isArray(node.childNodes)) {
    return;
  }

  for (const child of node.childNodes) {
    walkHtml(child, visitor, nextState);
  }
}

function parseHtmlFragment(html) {
  return parseFragment(html, { sourceCodeLocationInfo: true });
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

export function isSkippableUrl(value) {
  if (typeof value !== "string") {
    return true;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  return URL_SCHEMES_TO_SKIP.some((scheme) => trimmed.startsWith(scheme));
}

function isProbablyMediaUrl(value) {
  if (isSkippableUrl(value)) {
    return false;
  }

  try {
    const pathname = new URL(value, "https://jant.invalid").pathname.toLowerCase();
    if (
      pathname.includes("/media/") ||
      pathname.endsWith("/favicon.ico") ||
      pathname.endsWith("/apple-touch-icon.png")
    ) {
      return true;
    }

    for (const extension of MEDIA_FILE_EXTENSIONS) {
      if (pathname.endsWith(extension)) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

function getReferencedImageDefinitionIds(tree) {
  const ids = new Set();

  visit(tree, "imageReference", (node) => {
    if (typeof node.identifier === "string" && node.identifier.trim() !== "") {
      ids.add(node.identifier);
    }
  });

  return ids;
}

function getHtmlAttrValueRange(html, attrLocation) {
  if (!attrLocation) {
    return null;
  }

  const attrSource = html.slice(attrLocation.startOffset, attrLocation.endOffset);
  const eqIndex = attrSource.indexOf("=");
  if (eqIndex === -1) {
    return null;
  }

  let valueIndex = eqIndex + 1;
  while (valueIndex < attrSource.length && /\s/.test(attrSource[valueIndex])) {
    valueIndex += 1;
  }

  if (valueIndex >= attrSource.length) {
    return null;
  }

  const quote = attrSource[valueIndex];
  if (quote === '"' || quote === "'") {
    const endQuoteIndex = attrSource.lastIndexOf(quote);
    if (endQuoteIndex <= valueIndex) {
      return null;
    }

    return {
      start: attrLocation.startOffset + valueIndex + 1,
      end: attrLocation.startOffset + endQuoteIndex,
    };
  }

  let valueEnd = valueIndex;
  while (valueEnd < attrSource.length && !/\s/.test(attrSource[valueEnd])) {
    valueEnd += 1;
  }

  return {
    start: attrLocation.startOffset + valueIndex,
    end: attrLocation.startOffset + valueEnd,
  };
}

function applyPatches(source, patches) {
  if (patches.length === 0) {
    return source;
  }

  const sorted = [...patches].sort((a, b) => b.start - a.start);
  let result = source;

  for (const patch of sorted) {
    result =
      result.slice(0, patch.start) + patch.replacement + result.slice(patch.end);
  }

  return result;
}

function collectHtmlMediaReferences(html) {
  const imageRefs = [];
  const audioRefs = [];
  const sourceRefs = [];
  const posterRefs = [];
  const linkRefs = [];
  const metaRefs = [];
  const fragment = parseHtmlFragment(html);

  walkHtml(fragment, (node, state) => {
    if (node.tagName === "script" && hasDataJantMetaAttribute(node)) {
      try {
        const meta = JSON.parse(getHtmlChildText(node).trim());
        if (typeof meta.src === "string" && !isSkippableUrl(meta.src)) {
          metaRefs.push(meta.src);
        }
        if (typeof meta.poster === "string" && !isSkippableUrl(meta.poster)) {
          metaRefs.push(meta.poster);
        }
      } catch {
        // Ignore malformed metadata and keep discovering other refs.
      }
      return;
    }

    if (node.tagName === "img") {
      const value = getAttribute(node, "src");
      if (typeof value === "string" && !isSkippableUrl(value)) {
        imageRefs.push(value);
      }
      return;
    }

    if (node.tagName === "audio") {
      const value = getAttribute(node, "src");
      if (typeof value === "string" && !isSkippableUrl(value)) {
        audioRefs.push(value);
      }
      return;
    }

    if (node.tagName === "source") {
      const value = getAttribute(node, "src");
      if (typeof value === "string" && !isSkippableUrl(value)) {
        sourceRefs.push(value);
      }
      return;
    }

    if (node.tagName === "video") {
      const value = getAttribute(node, "poster");
      if (typeof value === "string" && !isSkippableUrl(value)) {
        posterRefs.push(value);
      }
      return;
    }

    if (
      node.tagName === "a" &&
      (state.inAttachmentFigure || isProbablyMediaUrl(getAttribute(node, "href")))
    ) {
      const value = getAttribute(node, "href");
      if (typeof value === "string" && !isSkippableUrl(value)) {
        linkRefs.push(value);
      }
    }
  });

  return [
    ...imageRefs,
    ...audioRefs,
    ...sourceRefs,
    ...posterRefs,
    ...linkRefs,
    ...metaRefs,
  ];
}

function rewriteHtmlMediaReferences(html, replacements) {
  const fragment = parseHtmlFragment(html);
  const patches = [];

  walkHtml(fragment, (node, state) => {
    if (node.tagName === "script" && hasDataJantMetaAttribute(node)) {
      const textNode = Array.isArray(node.childNodes)
        ? node.childNodes.find(
            (child) =>
              child.nodeName === "#text" &&
              typeof child.value === "string" &&
              child.sourceCodeLocation,
          )
        : null;

      if (!textNode?.sourceCodeLocation) {
        return;
      }

      let updatedText = textNode.value;
      for (const [from, to] of replacements) {
        updatedText = updatedText.replaceAll(from, to);
      }

      if (updatedText !== textNode.value) {
        patches.push({
          start: textNode.sourceCodeLocation.startOffset,
          end: textNode.sourceCodeLocation.endOffset,
          replacement: updatedText,
        });
      }
      return;
    }

    const attrCandidates = [];
    if (node.tagName === "img" || node.tagName === "audio" || node.tagName === "source") {
      attrCandidates.push("src");
    }
    if (node.tagName === "video") {
      attrCandidates.push("poster");
    }
    if (
      node.tagName === "a" &&
      (state.inAttachmentFigure || isProbablyMediaUrl(getAttribute(node, "href")))
    ) {
      attrCandidates.push("href");
    }

    for (const attrName of attrCandidates) {
      const value = getAttribute(node, attrName);
      const nextValue = typeof value === "string" ? replacements.get(value) : null;
      if (!nextValue || nextValue === value) {
        continue;
      }

      const attrRange = getHtmlAttrValueRange(
        html,
        node.sourceCodeLocation?.attrs?.[attrName],
      );
      if (!attrRange) {
        continue;
      }

      patches.push({
        start: attrRange.start,
        end: attrRange.end,
        replacement: nextValue,
      });
    }
  });

  return applyPatches(html, patches);
}

function buildMarkdownUrlPatch(content, node, currentUrl, nextUrl, mode = "inline") {
  if (!nextUrl || nextUrl === currentUrl) {
    return null;
  }

  const startOffset = getStartOffset(node);
  const endOffset = getEndOffset(node);
  if (typeof startOffset !== "number" || typeof endOffset !== "number") {
    return null;
  }

  const source = content.slice(startOffset, endOffset);
  let searchStart = 0;
  if (mode === "inline") {
    const markerIndex = source.indexOf("](");
    if (markerIndex !== -1) {
      searchStart = markerIndex + 2;
    }
  } else if (mode === "definition") {
    const markerIndex = source.indexOf("]:");
    if (markerIndex !== -1) {
      searchStart = markerIndex + 2;
    }
  }

  const relativeIndex = source.indexOf(currentUrl, searchStart);
  if (relativeIndex === -1) {
    return null;
  }

  return {
    start: startOffset + relativeIndex,
    end: startOffset + relativeIndex + currentUrl.length,
    replacement: nextUrl,
  };
}

export function collectMediaReferences(content) {
  const tree = parseMarkdown(content);
  const referencedDefinitionIds = getReferencedImageDefinitionIds(tree);
  const refs = [];

  visit(tree, (node) => {
    if (node.type === "image" && typeof node.url === "string" && !isSkippableUrl(node.url)) {
      refs.push(node.url);
      return;
    }

    if (
      node.type === "definition" &&
      referencedDefinitionIds.has(node.identifier) &&
      typeof node.url === "string" &&
      !isSkippableUrl(node.url)
    ) {
      refs.push(node.url);
      return;
    }

    if (node.type === "html" && typeof node.value === "string") {
      refs.push(...collectHtmlMediaReferences(node.value));
    }
  });

  return uniqueStrings(refs);
}

export function rewriteMediaReferences(content, replacements) {
  if (!(replacements instanceof Map) || replacements.size === 0) {
    return content;
  }

  const tree = parseMarkdown(content);
  const referencedDefinitionIds = getReferencedImageDefinitionIds(tree);
  const patches = [];

  visit(tree, (node) => {
    if (node.type === "image" && typeof node.url === "string") {
      const patch = buildMarkdownUrlPatch(
        content,
        node,
        node.url,
        replacements.get(node.url),
        "inline",
      );
      if (patch) {
        patches.push(patch);
      }
      return;
    }

    if (
      node.type === "definition" &&
      referencedDefinitionIds.has(node.identifier) &&
      typeof node.url === "string"
    ) {
      const patch = buildMarkdownUrlPatch(
        content,
        node,
        node.url,
        replacements.get(node.url),
        "definition",
      );
      if (patch) {
        patches.push(patch);
      }
      return;
    }

    if (node.type === "html" && typeof node.value === "string") {
      const startOffset = getStartOffset(node);
      const endOffset = getEndOffset(node);
      if (typeof startOffset !== "number" || typeof endOffset !== "number") {
        return;
      }

      const updated = rewriteHtmlMediaReferences(node.value, replacements);
      if (updated !== node.value) {
        patches.push({
          start: startOffset,
          end: endOffset,
          replacement: updated,
        });
      }
    }
  });

  return applyPatches(content, patches);
}

export function findImageUrls(content) {
  const tree = parseMarkdown(content);
  const referencedDefinitionIds = getReferencedImageDefinitionIds(tree);
  const refs = [];

  visit(tree, (node) => {
    if (node.type === "image" && typeof node.url === "string" && !isSkippableUrl(node.url)) {
      refs.push(node.url);
      return;
    }

    if (
      node.type === "definition" &&
      referencedDefinitionIds.has(node.identifier) &&
      typeof node.url === "string" &&
      !isSkippableUrl(node.url)
    ) {
      refs.push(node.url);
      return;
    }

    if (node.type !== "html" || typeof node.value !== "string") {
      return;
    }

    const fragment = parseHtmlFragment(node.value);
    walkHtml(fragment, (htmlNode) => {
      if (htmlNode.tagName !== "img") {
        return;
      }

      const value = getAttribute(htmlNode, "src");
      if (typeof value === "string" && !isSkippableUrl(value)) {
        refs.push(value);
      }
    });
  });

  return uniqueStrings(refs);
}

function parseAttachmentBlockHtml(html) {
  const fragment = parseHtmlFragment(html);
  const rootNodes = (fragment.childNodes || []).filter(
    (node) => !isWhitespaceHtmlNode(node),
  );
  if (rootNodes.length !== 1 || !isAttachmentRoot(rootNodes[0])) {
    return null;
  }

  const attachments = [];
  walkHtml(rootNodes[0], (node) => {
    if (!isAttachmentFigure(node)) {
      return;
    }

    const script = Array.isArray(node.childNodes)
      ? node.childNodes.find(
          (child) =>
            child.tagName === "script" &&
            hasDataJantMetaAttribute(child),
        )
      : null;
    if (!script) {
      return;
    }

    try {
      attachments.push(JSON.parse(getHtmlChildText(script).trim()));
    } catch {
      // Ignore malformed metadata and keep importing the rest.
    }
  });

  return attachments;
}

export function extractAttachmentBlocks(markdown) {
  const tree = parseMarkdown(markdown);
  const attachments = [];
  const removalPatches = [];

  visit(tree, "html", (node) => {
    if (typeof node.value !== "string") {
      return;
    }

    const blockAttachments = parseAttachmentBlockHtml(node.value);
    if (!blockAttachments) {
      return;
    }

    attachments.push(...blockAttachments);
    const startOffset = getStartOffset(node);
    const endOffset = getEndOffset(node);
    if (typeof startOffset !== "number" || typeof endOffset !== "number") {
      return;
    }

    removalPatches.push({
      start: startOffset,
      end: endOffset,
      replacement: "",
    });
  });

  const strippedMarkdown = applyPatches(markdown, removalPatches)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    markdown: strippedMarkdown,
    attachments,
  };
}
