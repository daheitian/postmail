import { describe, it, expect } from "vitest";
import { entitiesToMarkdown } from "../telegram-entities.js";
import type { TelegramMessageEntity } from "../telegram.js";

function ents(
  ...entries: Array<
    Partial<TelegramMessageEntity> & {
      type: string;
      offset: number;
      length: number;
    }
  >
): TelegramMessageEntity[] {
  return entries as TelegramMessageEntity[];
}

describe("entitiesToMarkdown", () => {
  it("returns text unchanged when entities is empty or undefined", () => {
    expect(entitiesToMarkdown("hello", [])).toBe("hello");
    expect(entitiesToMarkdown("hello", undefined)).toBe("hello");
  });

  it("preserves user-typed markdown that sits outside any entity", () => {
    // No entities → byte-for-byte passthrough. This is the case where the
    // user typed literal markdown into Telegram instead of using its
    // formatting menu.
    expect(entitiesToMarkdown("**already bold** _italic_", [])).toBe(
      "**already bold** _italic_",
    );
  });

  it("wraps bold, italic, and strikethrough spans", () => {
    expect(
      entitiesToMarkdown(
        "bold italic strike",
        ents(
          { type: "bold", offset: 0, length: 4 },
          { type: "italic", offset: 5, length: 6 },
          { type: "strikethrough", offset: 12, length: 6 },
        ),
      ),
    ).toBe("**bold** *italic* ~~strike~~");
  });

  it("wraps text_link entities with the url", () => {
    expect(
      entitiesToMarkdown(
        "see Jant for details",
        ents({
          type: "text_link",
          offset: 4,
          length: 4,
          url: "https://jant.example/",
        }),
      ),
    ).toBe("see [Jant](https://jant.example/) for details");
  });

  it("escapes parentheses in link URLs", () => {
    expect(
      entitiesToMarkdown(
        "ref",
        ents({
          type: "text_link",
          offset: 0,
          length: 3,
          url: "https://en.wikipedia.org/wiki/Foo_(bar)",
        }),
      ),
    ).toBe("[ref](https://en.wikipedia.org/wiki/Foo_\\(bar\\))");
  });

  it("uses the shortest non-colliding fence for inline code with backticks", () => {
    // Content has a single backtick, so a double-backtick fence is required.
    expect(
      entitiesToMarkdown(
        "use `code` here",
        ents({ type: "code", offset: 4, length: 6 }),
      ),
    ).toBe("use `` `code` `` here");
  });

  it("emits fenced code blocks with the entity language", () => {
    expect(
      entitiesToMarkdown(
        "print(1)",
        ents({ type: "pre", offset: 0, length: 8, language: "python" }),
      ),
    ).toBe("```python\nprint(1)\n```");
  });

  it("escapes markdown delimiters that appear inside a styled span", () => {
    // Without escaping, the inner `_underscore_` would render as italic
    // when the post body is parsed as markdown, even though the user only
    // asked for bold.
    expect(
      entitiesToMarkdown(
        "a _b_ c",
        ents({ type: "bold", offset: 0, length: 7 }),
      ),
    ).toBe("**a \\_b\\_ c**");
  });

  it("handles nested entities (italic inside bold)", () => {
    // "bold and italic" — bold covers the whole span, italic covers "italic"
    expect(
      entitiesToMarkdown(
        "bold and italic",
        ents(
          { type: "bold", offset: 0, length: 15 },
          { type: "italic", offset: 9, length: 6 },
        ),
      ),
    ).toBe("**bold and *italic***");
  });

  it("renders a bold link as a bold-wrapped markdown link", () => {
    expect(
      entitiesToMarkdown(
        "click here",
        ents(
          { type: "bold", offset: 0, length: 10 },
          {
            type: "text_link",
            offset: 6,
            length: 4,
            url: "https://example.com/",
          },
        ),
      ),
    ).toBe("**click [here](https://example.com/)**");
  });

  it("leaves auto-detected url/mention/hashtag entities as plain text", () => {
    // Telegram tags these automatically; markdown will auto-link the URL.
    expect(
      entitiesToMarkdown(
        "visit https://jant.example/ @alice #news",
        ents(
          { type: "url", offset: 6, length: 21 },
          { type: "mention", offset: 28, length: 6 },
          { type: "hashtag", offset: 35, length: 5 },
        ),
      ),
    ).toBe("visit https://jant.example/ @alice #news");
  });

  it("renders blockquote entities with `> ` per line", () => {
    expect(
      entitiesToMarkdown(
        "line one\nline two",
        ents({ type: "blockquote", offset: 0, length: 17 }),
      ),
    ).toBe("> line one\n> line two");
  });

  it("uses UTF-16 offsets so surrogate-pair emoji align correctly", () => {
    // The emoji is one Telegram "character" but two JS code units. Telegram
    // sends offset 3 / length 4 for "bold" — that lands on indices 3..7 in
    // the JS string, which is exactly what slice expects.
    const text = "👋 hi bold tail";
    // wave emoji is two UTF-16 units, so the string is 15 long, not 14.
    expect(text.length).toBe(15);
    expect(text.slice(6, 10)).toBe("bold");
    expect(
      entitiesToMarkdown(text, ents({ type: "bold", offset: 6, length: 4 })),
    ).toBe("👋 hi **bold** tail");
  });

  it("does not escape markdown chars between top-level entities", () => {
    // Bold span at the end; the **literal asterisks** the user typed before
    // it must pass through unchanged.
    expect(
      entitiesToMarkdown(
        "**typed** styled",
        ents({ type: "bold", offset: 10, length: 6 }),
      ),
    ).toBe("**typed** **styled**");
  });
});
