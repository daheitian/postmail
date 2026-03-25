import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { parseFragment } from "parse5";
import { visit, SKIP } from "unist-util-visit";

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

function getHtmlTextContent(node) {
  if (!node) {
    return "";
  }

  if (node.nodeName === "#text" && typeof node.value === "string") {
    return node.value;
  }

  if (!Array.isArray(node.childNodes)) {
    return "";
  }

  return node.childNodes.map((child) => getHtmlTextContent(child)).join("");
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeMarkdownText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
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

function getNonWhitespaceHtmlNodes(nodes) {
  return (nodes || []).filter((node) => !isWhitespaceHtmlNode(node));
}

function findHtmlNode(node, predicate) {
  if (!node) {
    return null;
  }

  if (predicate(node)) {
    return node;
  }

  if (!Array.isArray(node.childNodes)) {
    return null;
  }

  for (const child of node.childNodes) {
    const match = findHtmlNode(child, predicate);
    if (match) {
      return match;
    }
  }

  return null;
}

function getPrimarySrcsetUrl(value) {
  if (typeof value !== "string") {
    return null;
  }

  const candidate = value
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean);
  if (!candidate) {
    return null;
  }

  const [url] = candidate.split(/\s+/, 1);
  return typeof url === "string" && url.trim() !== "" ? url : null;
}

function getImageSourceFromNode(node) {
  if (!node) {
    return null;
  }

  if (node.tagName === "img") {
    return getAttribute(node, "src") || getPrimarySrcsetUrl(getAttribute(node, "srcset"));
  }

  if (node.tagName === "picture") {
    const imgNode = findHtmlNode(node, (child) => child.tagName === "img");
    if (imgNode) {
      return getImageSourceFromNode(imgNode);
    }

    const sourceNode = findHtmlNode(node, (child) => child.tagName === "source");
    if (sourceNode) {
      return (
        getAttribute(sourceNode, "src") ||
        getPrimarySrcsetUrl(getAttribute(sourceNode, "srcset"))
      );
    }
  }

  return null;
}

function extractImageDetails(node) {
  const imgNode = node?.tagName === "img"
    ? node
    : findHtmlNode(node, (child) => child.tagName === "img");
  const pictureNode = node?.tagName === "picture"
    ? node
    : findHtmlNode(node, (child) => child.tagName === "picture");
  const sourceNode = pictureNode || imgNode;
  const src = getImageSourceFromNode(sourceNode);
  if (!src || isSkippableUrl(src)) {
    return null;
  }

  return {
    src,
    alt: typeof getAttribute(imgNode, "alt") === "string" ? getAttribute(imgNode, "alt") : "",
    title:
      typeof getAttribute(imgNode, "title") === "string"
        ? getAttribute(imgNode, "title")
        : "",
  };
}

function getFigureCaption(node) {
  if (node?.tagName !== "figure") {
    return "";
  }

  const captionNode = getNonWhitespaceHtmlNodes(node.childNodes).find(
    (child) => child.tagName === "figcaption",
  );
  if (!captionNode) {
    return "";
  }

  return getHtmlTextContent(captionNode).trim();
}

function extractGenericImageSpec(rootNode) {
  if (!rootNode || isAttachmentRoot(rootNode) || isAttachmentFigure(rootNode)) {
    return null;
  }

  if (
    rootNode.tagName === "figure" &&
    getAttribute(rootNode, "data-jant-node") === "image"
  ) {
    return null;
  }

  if (findHtmlNode(rootNode, (child) => child.tagName === "video" || child.tagName === "audio")) {
    return null;
  }

  const image = extractImageDetails(rootNode);
  if (!image) {
    return null;
  }

  let href = "";
  if (rootNode.tagName === "a") {
    href = getAttribute(rootNode, "href") || "";
  } else {
    const anchorNode = findHtmlNode(
      rootNode,
      (child) => child.tagName === "a" && Boolean(extractImageDetails(child)),
    );
    href = getAttribute(anchorNode, "href") || "";
  }

  return {
    ...image,
    href: !isSkippableUrl(href) ? href : "",
    caption: getFigureCaption(rootNode),
  };
}

function getMediaSourceFromNode(node) {
  if (!node) {
    return null;
  }

  const directSrc = getAttribute(node, "src");
  if (typeof directSrc === "string" && directSrc.trim() !== "") {
    return directSrc;
  }

  const sourceNode = findHtmlNode(node, (child) => child.tagName === "source");
  if (!sourceNode) {
    return null;
  }

  return (
    getAttribute(sourceNode, "src") ||
    getPrimarySrcsetUrl(getAttribute(sourceNode, "srcset"))
  );
}

function extractGenericAttachmentSpec(rootNode) {
  if (!rootNode || isAttachmentRoot(rootNode) || isAttachmentFigure(rootNode)) {
    return null;
  }

  const mediaNode =
    rootNode.tagName === "video" || rootNode.tagName === "audio"
      ? rootNode
      : findHtmlNode(
          rootNode,
          (child) => child.tagName === "video" || child.tagName === "audio",
        );
  if (!mediaNode) {
    return null;
  }

  const src = getMediaSourceFromNode(mediaNode);
  if (!src || isSkippableUrl(src)) {
    return null;
  }

  const poster =
    mediaNode.tagName === "video" ? getAttribute(mediaNode, "poster") || "" : "";
  const summary = getFigureCaption(rootNode);

  return {
    kind: mediaNode.tagName === "video" ? "video" : "audio",
    src,
    ...(poster && !isSkippableUrl(poster) ? { poster } : {}),
    ...(summary ? { summary } : {}),
  };
}

function renderJantImageHtml(image) {
  const imgAttrs = [`src="${escapeHtml(image.src)}"`];
  if (image.alt) {
    imgAttrs.push(`alt="${escapeHtml(image.alt)}"`);
  }
  if (image.title) {
    imgAttrs.push(`title="${escapeHtml(image.title)}"`);
  }

  const imgTag = `<img ${imgAttrs.join(" ")}>`;
  const content = image.href
    ? `<a href="${escapeHtml(image.href)}">${imgTag}</a>`
    : imgTag;
  const figcaption = image.caption
    ? `<figcaption>${escapeHtml(image.caption)}</figcaption>`
    : "";

  return `<figure data-jant-node="image">${content}${figcaption}</figure>`;
}

function renderMarkdownImage(image) {
  const alt = escapeMarkdownText(image.alt || "");
  const title = image.title
    ? ` "${String(image.title).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    : "";
  return `![${alt}](${image.src}${title})`;
}

function normalizeStandaloneHtmlFragment(html) {
  const fragment = parseHtmlFragment(html);
  const rootNodes = getNonWhitespaceHtmlNodes(fragment.childNodes);
  if (rootNodes.length !== 1) {
    return null;
  }

  const [rootNode] = rootNodes;
  const attachment = extractGenericAttachmentSpec(rootNode);
  if (attachment) {
    return {
      markdown: "",
      attachments: [attachment],
    };
  }

  const image = extractGenericImageSpec(rootNode);
  if (!image) {
    return null;
  }

  return {
    markdown: renderJantImageHtml(image),
    attachments: [],
  };
}

function normalizeInlineHtmlFragment(html) {
  const fragment = parseHtmlFragment(html);
  const rootNodes = getNonWhitespaceHtmlNodes(fragment.childNodes);
  if (rootNodes.length !== 1) {
    return null;
  }

  const [rootNode] = rootNodes;
  const image = extractGenericImageSpec(rootNode);
  if (!image) {
    return null;
  }

  return renderMarkdownImage(image);
}

function paragraphHasMeaningfulText(children) {
  return (children || []).some(
    (child) =>
      child.type !== "html" &&
      typeof child.value === "string" &&
      child.value.trim() !== "",
  );
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

export function normalizeImportedBody(markdown) {
  const tree = parseMarkdown(markdown);
  const attachments = [];
  const patches = [];

  visit(tree, (node, _index, parent) => {
    if (node.type === "paragraph" && Array.isArray(node.children)) {
      const startOffset = getStartOffset(node);
      const endOffset = getEndOffset(node);
      if (
        !paragraphHasMeaningfulText(node.children) &&
        typeof startOffset === "number" &&
        typeof endOffset === "number"
      ) {
        const normalized = normalizeStandaloneHtmlFragment(
          markdown.slice(startOffset, endOffset),
        );
        if (normalized) {
          attachments.push(...normalized.attachments);
          patches.push({
            start: startOffset,
            end: endOffset,
            replacement: normalized.markdown,
          });
          return SKIP;
        }
      }
      return;
    }

    if (node.type !== "html" || typeof node.value !== "string") {
      return;
    }

    const startOffset = getStartOffset(node);
    const endOffset = getEndOffset(node);
    if (typeof startOffset !== "number" || typeof endOffset !== "number") {
      return;
    }

    if (parent?.type !== "paragraph") {
      const normalizedBlock = normalizeStandaloneHtmlFragment(node.value);
      if (normalizedBlock) {
        attachments.push(...normalizedBlock.attachments);
        patches.push({
          start: startOffset,
          end: endOffset,
          replacement: normalizedBlock.markdown,
        });
        return;
      }
    }

    const normalizedInline = normalizeInlineHtmlFragment(node.value);
    if (!normalizedInline) {
      return;
    }

    patches.push({
      start: startOffset,
      end: endOffset,
      replacement: normalizedInline,
    });
  });

  return {
    markdown: applyPatches(markdown, patches).replace(/\n{3,}/g, "\n\n").trim(),
    attachments,
  };
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
