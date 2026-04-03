import {
  Extension,
  Node,
  type AnyExtension,
  type Extensions,
  type JSONContent,
} from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import CodeBlock from "@tiptap/extension-code-block";
import StarterKit from "@tiptap/starter-kit";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import {
  getFootnoteDefinitionLabelText,
  getFootnoteReferenceText,
  indentFootnoteMarkdown,
  normalizeFootnoteArtifacts,
  normalizeFootnoteLabel,
  parseFootnoteDefinition,
} from "./footnotes.js";
import { renderMarkdownImage, type RichImageAttrs } from "./rich-image.js";

export const MARKDOWN_MARKED_OPTIONS = {
  gfm: true,
  breaks: false,
} as const;

const MORE_BREAK_MARKER = "<!--more-->";
const MORE_BREAK_VISIBLE_LABELS = ["Read More ↓", "Read More"] as const;
const MORE_BREAK_TOKENIZER_REGEX =
  /^(?:<!--more-->|Read More ↓|Read More)[ \t]*(?:\n|$)/;

function chooseCodeFence(content: string): string {
  const maxInnerFence = Math.max(
    2,
    ...Array.from(content.matchAll(/`+/g), (match) => match[0].length),
  );
  return "`".repeat(Math.max(3, maxInnerFence + 1));
}

interface QueryableElement {
  getAttribute(name: string): string | null;
  querySelector(selector: string): QueryableElement | null;
  textContent: string | null;
}

function readImageAttributesFromElement(element: QueryableElement) {
  const img = element.querySelector("img");
  const figcaption = element.querySelector("figcaption");
  const link = element.querySelector("a");

  return {
    src: img?.getAttribute("src") ?? "",
    alt: img?.getAttribute("alt") ?? "",
    title: img?.getAttribute("title") ?? "",
    caption: figcaption?.textContent ?? "",
    href: link?.getAttribute("href") ?? "",
    layout: element.getAttribute("data-layout") ?? "regular",
  };
}

function getHtmlAttribute(source: string, name: string): string | null {
  const match = source.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match?.[1] ?? null;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseImageFigureHtml(html: string): RichImageAttrs | null {
  const normalized = html.trim();
  const figureMatch = normalized.match(
    /^<figure\b([^>]*)data-jant-node="image"([^>]*)>([\s\S]*?)<\/figure>$/i,
  );
  if (!figureMatch) return null;

  const figureAttrs = `${figureMatch[1] ?? ""} ${figureMatch[2] ?? ""}`;
  const innerHtml = figureMatch[3] ?? "";
  const layout =
    getHtmlAttribute(figureAttrs, "data-jant-layout") ||
    getHtmlAttribute(figureAttrs, "data-layout") ||
    undefined;
  const anchorHref = innerHtml.match(/<a\b[^>]*href="([^"]*)"[^>]*>/i)?.[1];
  const imgMatch = innerHtml.match(/<img\b([^>]*)>/i);
  if (!imgMatch) return null;

  const imgAttrs = imgMatch[1] ?? "";
  const src = getHtmlAttribute(imgAttrs, "src");
  if (!src) return null;

  const captionMatch = innerHtml.match(/<figcaption>([\s\S]*?)<\/figcaption>/i);
  const rawCaption = captionMatch?.[1];
  const caption = rawCaption ? decodeHtml(rawCaption.trim()) : undefined;

  const attrs: RichImageAttrs = {
    src: decodeHtml(src),
  };
  const alt = getHtmlAttribute(imgAttrs, "alt");
  const title = getHtmlAttribute(imgAttrs, "title");
  if (alt) attrs.alt = decodeHtml(alt);
  if (title) attrs.title = decodeHtml(title);
  if (caption) attrs.caption = caption;
  if (anchorHref) attrs.href = decodeHtml(anchorHref);
  if (layout && layout !== "regular") attrs.layout = decodeHtml(layout);

  return attrs;
}
export { renderMarkdownImage as renderImageMarkdown } from "./rich-image.js";

export const MarkdownImageNode = Node.create({
  name: "image",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      title: { default: "" },
      caption: { default: "" },
      href: { default: "" },
      layout: { default: "regular" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-image]",
        getAttrs(dom) {
          return readImageAttributesFromElement(dom as QueryableElement);
        },
      },
      {
        tag: "figure",
        getAttrs(dom) {
          const element = dom as QueryableElement;
          if (!element.querySelector("img")) return false;
          return readImageAttributesFromElement(element);
        },
      },
      {
        tag: "img[src]",
        getAttrs(dom) {
          const element = dom as QueryableElement;
          return {
            src: element.getAttribute("src") ?? "",
            alt: element.getAttribute("alt") ?? "",
            title: element.getAttribute("title") ?? "",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const attrs: Record<string, string> = { "data-image": "" };
    if (node.attrs.layout && node.attrs.layout !== "regular") {
      attrs["data-layout"] = node.attrs.layout;
    }

    const imgAttrs: Record<string, string> = { src: node.attrs.src };
    if (node.attrs.alt) imgAttrs.alt = node.attrs.alt;
    if (node.attrs.title) imgAttrs.title = node.attrs.title;

    const imageNode: [string, Record<string, string>] = ["img", imgAttrs];
    const children: Array<
      | [string, Record<string, string>]
      | [string, Record<string, string>, ...unknown[]]
    > = [];

    if (node.attrs.href) {
      children.push(["a", { href: node.attrs.href }, imageNode]);
    } else {
      children.push(imageNode);
    }

    if (node.attrs.caption) {
      children.push(["figcaption", {}, node.attrs.caption]);
    }

    return ["figure", attrs, ...children];
  },

  parseMarkdown: (token, helpers) => {
    return helpers.createNode("image", {
      src: token.href,
      title: token.title ?? "",
      alt: token.text ?? "",
    });
  },

  renderMarkdown: (node) => {
    return renderMarkdownImage(node.attrs ?? {});
  },
});

const MarkdownCodeBlock = CodeBlock.extend({
  renderMarkdown(node, helpers) {
    const language = node.attrs?.language ? String(node.attrs.language) : "";
    const content = helpers.renderChildren(node.content ?? []);
    const fence = chooseCodeFence(content);

    return `${fence}${language}\n${content}\n${fence}`;
  },
});

const MarkdownFigureImageSupport = Extension.create({
  name: "markdownFigureImageSupport",

  markdownTokenName: "imageFigure",

  parseMarkdown: (token, helpers) => {
    return helpers.createNode("image", token.attrs ?? {});
  },

  markdownTokenizer: {
    name: "imageFigure",
    level: "block",
    start(src: string) {
      return src.indexOf("<figure");
    },
    tokenize(src: string) {
      const match = src.match(
        /^<figure\b[^>]*data-jant-node="image"[\s\S]*?<\/figure>(?:\n|$)?/i,
      );
      if (!match) return undefined;

      const attrs = parseImageFigureHtml(match[0]);
      if (!attrs) return undefined;

      return {
        type: "imageFigure",
        raw: match[0],
        attrs,
      };
    },
  },
});

export function createMoreBreakMarkdownToken() {
  return {
    name: "moreBreak",
    level: "block" as const,
    start(src: string) {
      const markerIndex = src.indexOf(MORE_BREAK_MARKER);
      let firstIndex = markerIndex;

      for (const label of MORE_BREAK_VISIBLE_LABELS) {
        const labelIndex = src.indexOf(label);
        if (labelIndex === -1) continue;
        firstIndex =
          firstIndex === -1 ? labelIndex : Math.min(firstIndex, labelIndex);
      }

      return firstIndex;
    },
    tokenize(src: string) {
      const match = src.match(MORE_BREAK_TOKENIZER_REGEX);
      if (!match) return undefined;

      return {
        type: "moreBreak",
        raw: match[0],
      };
    },
  };
}

export const MarkdownMoreBreak = Node.create({
  name: "moreBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [{ tag: "div[data-more-break]" }];
  },

  renderHTML() {
    return [
      "div",
      {
        "data-more-break": "",
        class: "tiptap-more-break",
      },
      "Read More ↓",
    ];
  },

  parseMarkdown: (_token, helpers) => helpers.createNode("moreBreak"),
  renderMarkdown: () => MORE_BREAK_MARKER,
  markdownTokenizer: createMoreBreakMarkdownToken(),
});

function createFootnoteReferenceMarkdownToken() {
  return {
    name: "footnoteReference",
    level: "inline" as const,
    start(src: string) {
      return src.indexOf("[^");
    },
    tokenize(src: string) {
      const match = src.match(/^\[\^([^\]\n]+)\]/);
      const label = normalizeFootnoteLabel(match?.[1]);
      if (!match || !label) return undefined;

      return {
        type: "footnoteReference",
        raw: match[0],
        label,
      };
    },
  };
}

export const MarkdownFootnoteReference = Node.create({
  name: "footnoteReference",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      label: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "sup[data-footnote-reference]",
        getAttrs(dom) {
          const element = dom as QueryableElement;
          return {
            label: normalizeFootnoteLabel(
              element.getAttribute("data-footnote-label"),
            ),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const label = normalizeFootnoteLabel(node.attrs.label);

    return [
      "sup",
      {
        "data-footnote-reference": "",
        "data-footnote-label": label,
        class: "tiptap-footnote-reference",
      },
      getFootnoteReferenceText(label),
    ];
  },

  parseMarkdown: (token, helpers) =>
    helpers.createNode("footnoteReference", {
      label: normalizeFootnoteLabel(token.label),
    }),

  renderMarkdown: (node) => getFootnoteReferenceText(node.attrs?.label),

  markdownTokenizer: createFootnoteReferenceMarkdownToken(),
});

export const MarkdownFootnoteDefinition = Node.create({
  name: "footnoteDefinition",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      label: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-footnote-definition]",
        getAttrs(dom) {
          const element = dom as QueryableElement;
          return {
            label: normalizeFootnoteLabel(
              element.getAttribute("data-footnote-label"),
            ),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const label = normalizeFootnoteLabel(node.attrs.label);

    return [
      "div",
      {
        "data-footnote-definition": "",
        "data-footnote-label": getFootnoteDefinitionLabelText(label),
        class: "tiptap-footnote-definition",
      },
      0,
    ];
  },

  parseMarkdown: (token, helpers) => {
    const content =
      Array.isArray(token.tokens) &&
      typeof helpers.parseBlockChildren === "function"
        ? helpers.parseBlockChildren(token.tokens)
        : [];

    return helpers.createNode(
      "footnoteDefinition",
      {
        label: normalizeFootnoteLabel(token.label),
      },
      content.length > 0 ? content : [helpers.createNode("paragraph")],
    );
  },

  renderMarkdown: (node, helpers) => {
    const label = normalizeFootnoteLabel(node.attrs?.label);
    const content = Array.isArray(node.content) ? node.content : [];
    const labelText = getFootnoteDefinitionLabelText(label);

    if (content.length === 0) {
      return labelText;
    }

    const renderedBlocks = content.map((child, index) =>
      typeof helpers.renderChild === "function"
        ? helpers.renderChild(child, index)
        : "",
    );
    const simpleParagraph =
      content.length === 1 &&
      content[0]?.type === "paragraph" &&
      !renderedBlocks[0]?.includes("\n");

    if (simpleParagraph) {
      return renderedBlocks[0]
        ? `${labelText} ${renderedBlocks[0]}`
        : labelText;
    }

    const indentedBlocks = renderedBlocks
      .map((block) => indentFootnoteMarkdown(block))
      .join("\n\n");

    return `${labelText}\n${indentedBlocks}`;
  },

  markdownTokenizer: {
    name: "footnoteDefinition",
    level: "block",
    start(src: string) {
      return src.indexOf("[^");
    },
    tokenize(src: string, _tokens: unknown[], helpers) {
      const definition = parseFootnoteDefinition(src);
      if (!definition) return undefined;

      return {
        type: "footnoteDefinition",
        raw: definition.raw,
        label: definition.label,
        tokens: definition.contentMarkdown
          ? helpers.blockTokens(definition.contentMarkdown)
          : [],
      };
    },
  },
});

interface MarkdownContentExtensionOptions {
  imageExtension?: AnyExtension;
  moreBreakExtension?: AnyExtension;
}

export function createMarkdownContentExtensions(
  options: MarkdownContentExtensionOptions = {},
): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: false },
      codeBlock: false,
    }),
    MarkdownCodeBlock,
    Table.configure({
      resizable: false,
      HTMLAttributes: { class: "tiptap-table" },
    }),
    TableRow,
    TableCell,
    TableHeader,
    MarkdownFigureImageSupport,
    options.imageExtension ?? MarkdownImageNode,
    options.moreBreakExtension ?? MarkdownMoreBreak,
    MarkdownFootnoteReference,
    MarkdownFootnoteDefinition,
  ];
}

function normalizeMarkdownDoc(node: JSONContent): JSONContent {
  const normalized: JSONContent = { ...node };

  if (normalized.content) {
    normalized.content = normalized.content.map(normalizeMarkdownDoc);
  }

  if (normalized.marks) {
    normalized.marks = normalized.marks.map((mark) => {
      if (!mark || typeof mark !== "object") return mark;

      const nextMark = {
        ...mark,
        attrs:
          mark.type === "link"
            ? {
                ...(mark.attrs ?? {}),
                target:
                  typeof mark.attrs?.target === "string"
                    ? mark.attrs.target
                    : "_blank",
              }
            : mark.attrs,
      };

      if (
        nextMark.attrs &&
        Object.keys(nextMark.attrs as Record<string, unknown>).length === 0
      ) {
        delete nextMark.attrs;
      }

      return nextMark;
    });
  }

  if (normalized.attrs && typeof normalized.attrs === "object") {
    const attrs = { ...normalized.attrs };

    if (normalized.type === "codeBlock" && attrs.language == null) {
      delete attrs.language;
    }

    if (Object.keys(attrs).length > 0) {
      normalized.attrs = attrs;
    } else {
      delete normalized.attrs;
    }
  }

  if (
    normalized.type === "doc" &&
    (!normalized.content || normalized.content.length === 0)
  ) {
    normalized.content = [{ type: "paragraph" }];
  }

  if (normalized.type === "paragraph" && normalized.content) {
    const nextContent: JSONContent[] = [];

    for (let index = 0; index < normalized.content.length; index += 1) {
      const child = normalized.content[index];
      const nextChild = normalized.content[index + 1];

      if (
        child?.type === "text" &&
        typeof child.text === "string" &&
        nextChild?.type === "footnoteReference" &&
        child.text.endsWith("\n")
      ) {
        const trimmedText = child.text.replace(/\n$/, "");
        if (trimmedText) {
          nextContent.push({
            ...child,
            text: trimmedText,
          });
        }
        continue;
      }

      if (child) {
        nextContent.push(child);
      }
    }

    normalized.content = nextContent;
  }

  return normalized;
}

function expandCodeBlockFences(markdown: string): string {
  return markdown;
}

export function createMarkdownManager(
  extensions: Extensions = createMarkdownContentExtensions(),
): MarkdownManager {
  return new MarkdownManager({
    extensions,
    markedOptions: MARKDOWN_MARKED_OPTIONS,
  });
}

let sharedMarkdownManager: MarkdownManager | null = null;

export function getMarkdownManager(): MarkdownManager {
  sharedMarkdownManager ??= createMarkdownManager();
  return sharedMarkdownManager;
}

export function parseMarkdownDocument(markdown: string): JSONContent {
  return normalizeMarkdownDoc(getMarkdownManager().parse(markdown));
}

export function serializeMarkdownDocument(doc: JSONContent): string {
  return expandCodeBlockFences(
    getMarkdownManager().serialize(normalizeFootnoteArtifacts(doc)),
  );
}
