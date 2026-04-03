import { describe, expect, it } from "vitest";
import { renderTiptapDocument, renderTiptapJson } from "../tiptap-render.js";

function doc(...content: Record<string, unknown>[]) {
  return { type: "doc", content };
}

function p(...content: Record<string, unknown>[]) {
  return { type: "paragraph", content };
}

function text(value: string, marks?: Record<string, unknown>[]) {
  return marks
    ? { type: "text", text: value, marks }
    : { type: "text", text: value };
}

describe("renderTiptapDocument", () => {
  it("renders parsed document objects directly", () => {
    expect(renderTiptapDocument(doc(p(text("Hello world"))))).toBe(
      "<p>Hello world</p>",
    );
  });

  it("renders links with safe target attributes when present", () => {
    const html = renderTiptapDocument(
      doc(
        p(
          text("OpenAI", [
            {
              type: "link",
              attrs: {
                href: "https://openai.com",
                target: "_blank",
              },
            },
          ]),
        ),
      ),
    );

    expect(html).toBe(
      '<p><a href="https://openai.com" target="_blank" rel="noopener noreferrer">OpenAI</a></p>',
    );
  });

  it("renders rich image figures consistently", () => {
    const html = renderTiptapDocument(
      doc({
        type: "image",
        attrs: {
          src: "https://example.com/img.png",
          alt: "Alt",
          title: "Title",
          caption: "Caption",
          href: "https://example.com/source",
          layout: "wide",
        },
      }),
    );

    expect(html).toBe(
      '<figure data-layout="wide"><a href="https://example.com/source"><img src="https://example.com/img.png" alt="Alt" title="Title"></a><figcaption>Caption</figcaption></figure>',
    );
  });

  it("renders footnote references inline and definitions in a trailing section", () => {
    const html = renderTiptapDocument(
      doc(
        p(text("Body copy"), {
          type: "footnoteReference",
          attrs: { label: "1" },
        }),
        {
          type: "footnoteDefinition",
          attrs: { label: "1" },
          content: [p(text("Footnote body"))],
        },
      ),
    );

    expect(html).toBe(
      '<p>Body copy<sup class="footnote-ref" data-footnote-reference><a href="#fn-1" id="fnref-1">1</a></sup></p><section class="footnotes" data-footnotes><ol><li id="fn-1"><p>Footnote body <a href="#fnref-1" class="footnote-backref" aria-label="Back to reference">↩</a></p></li></ol></section>',
    );
  });

  it("renders code blocks as escaped text, not nested inline markup", () => {
    const html = renderTiptapDocument(
      doc({
        type: "codeBlock",
        attrs: { language: "ts" },
        content: [{ type: "text", text: "const x = `<div>`;" }],
      }),
    );

    expect(html).toBe(
      '<pre><code class="language-ts">const x = `&lt;div&gt;`;</code></pre>',
    );
  });

  it("falls back to rendering children for unknown nodes", () => {
    const html = renderTiptapDocument(
      doc({
        type: "unknownWrapper",
        content: [p(text("Still visible"))],
      }),
    );

    expect(html).toBe("<p>Still visible</p>");
  });
});

describe("renderTiptapJson", () => {
  it("returns an empty string for invalid JSON", () => {
    expect(renderTiptapJson("not json")).toBe("");
  });

  it("returns an empty string for non-doc JSON", () => {
    expect(renderTiptapDocument({ type: "paragraph" })).toBe("");
  });
});
