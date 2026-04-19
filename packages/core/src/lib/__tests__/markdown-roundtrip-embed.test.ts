import { describe, expect, it } from "vitest";
import {
  parseMarkdownDocument,
  serializeMarkdownDocument,
} from "../markdown-manager.js";

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
}

function findNode(node: TiptapNode, type: string): TiptapNode | null {
  if (node.type === type) return node;
  for (const child of node.content ?? []) {
    const found = findNode(child, type);
    if (found) return found;
  }
  return null;
}

describe("markdown round-trip: embed", () => {
  it("parses a ```jant-embed fenced block into an embed node", () => {
    const md =
      "```jant-embed\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n```";
    const doc = parseMarkdownDocument(md) as TiptapNode;
    const embed = findNode(doc, "embed");
    expect(embed).not.toBeNull();
    expect(embed?.attrs?.url).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });

  it("parses optional caption=value lines", () => {
    const md = [
      "```jant-embed",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "caption=Rickroll",
      "```",
    ].join("\n");
    const doc = parseMarkdownDocument(md) as TiptapNode;
    const embed = findNode(doc, "embed");
    expect(embed?.attrs?.caption).toBe("Rickroll");
  });

  it("serializes an embed node back to a fenced block", () => {
    const md = "```jant-embed\nhttps://vimeo.com/123456789\n```";
    const doc = parseMarkdownDocument(md);
    const out = serializeMarkdownDocument(doc).trim();
    expect(out).toContain("```jant-embed");
    expect(out).toContain("https://vimeo.com/123456789");
    expect(out.trim().endsWith("```")).toBe(true);
  });

  it("preserves caption through a round-trip", () => {
    const md = [
      "```jant-embed",
      "https://vimeo.com/123456789",
      "caption=Trip",
      "```",
    ].join("\n");
    const out = serializeMarkdownDocument(parseMarkdownDocument(md)).trim();
    expect(out).toContain("caption=Trip");
  });
});

describe("markdown round-trip: htmlBlock", () => {
  it("parses a ```jant-html fenced block into a htmlBlock node", () => {
    const md = [
      "```jant-html",
      '<script src="https://letterbird.co/embed/v1.js"></script>',
      "```",
    ].join("\n");
    const doc = parseMarkdownDocument(md) as TiptapNode;
    const block = findNode(doc, "htmlBlock");
    expect(block).not.toBeNull();
    expect(block?.attrs?.html).toContain("letterbird.co/embed/v1.js");
  });

  it("preserves raw HTML verbatim through a round-trip", () => {
    const inner =
      '<script data-letterbirduser="you" src="https://letterbird.co/embed/v1.js"></script>';
    const md = ["```jant-html", inner, "```"].join("\n");
    const out = serializeMarkdownDocument(parseMarkdownDocument(md)).trim();
    expect(out).toContain("```jant-html");
    expect(out).toContain(inner);
  });
});
