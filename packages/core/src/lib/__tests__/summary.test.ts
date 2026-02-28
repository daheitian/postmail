import { describe, it, expect } from "vitest";
import { extractBodyText } from "../summary.js";

describe("extractBodyText", () => {
  it("extracts text from paragraphs", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second paragraph" }],
        },
      ],
    });

    expect(extractBodyText(doc)).toBe("Hello world Second paragraph");
  });

  it("extracts text from headings", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "My Title" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Body text" }],
        },
      ],
    });

    expect(extractBodyText(doc)).toBe("My Title Body text");
  });

  it("extracts text from bullet lists", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item one" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item two" }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(extractBodyText(doc)).toContain("Item one");
    expect(extractBodyText(doc)).toContain("Item two");
  });

  it("extracts text from ordered lists", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First" }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(extractBodyText(doc)).toContain("First");
  });

  it("extracts text from blockquotes", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Quoted text" }],
            },
          ],
        },
      ],
    });

    expect(extractBodyText(doc)).toContain("Quoted text");
  });

  it("extracts text from code blocks", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "codeBlock",
          content: [{ type: "text", text: "const x = 1;" }],
        },
      ],
    });

    expect(extractBodyText(doc)).toBe("const x = 1;");
  });

  it("extracts text from tables", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell data" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(extractBodyText(doc)).toContain("Header");
    expect(extractBodyText(doc)).toContain("Cell data");
  });

  it("skips image nodes", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Before image" }],
        },
        {
          type: "image",
          attrs: { src: "https://example.com/img.png", alt: "Alt text" },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "After image" }],
        },
      ],
    });

    const result = extractBodyText(doc);
    expect(result).toContain("Before image");
    expect(result).toContain("After image");
    expect(result).not.toContain("Alt text");
    expect(result).not.toContain("img.png");
  });

  it("skips moreBreak nodes", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Before break" }],
        },
        { type: "moreBreak" },
        {
          type: "paragraph",
          content: [{ type: "text", text: "After break" }],
        },
      ],
    });

    const result = extractBodyText(doc);
    expect(result).toContain("Before break");
    expect(result).toContain("After break");
  });

  it("skips horizontalRule nodes", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Above rule" }],
        },
        { type: "horizontalRule" },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Below rule" }],
        },
      ],
    });

    const result = extractBodyText(doc);
    expect(result).toContain("Above rule");
    expect(result).toContain("Below rule");
  });

  it("returns null for invalid JSON", () => {
    expect(extractBodyText("not json")).toBeNull();
    expect(extractBodyText("{invalid")).toBeNull();
  });

  it("returns null for empty doc", () => {
    const doc = JSON.stringify({ type: "doc", content: [] });
    expect(extractBodyText(doc)).toBeNull();
  });

  it("returns null for non-doc type", () => {
    const doc = JSON.stringify({ type: "paragraph", content: [] });
    expect(extractBodyText(doc)).toBeNull();
  });

  it("returns null for doc without content", () => {
    const doc = JSON.stringify({ type: "doc" });
    expect(extractBodyText(doc)).toBeNull();
  });
});
