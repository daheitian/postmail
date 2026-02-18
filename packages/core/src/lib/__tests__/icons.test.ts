import { describe, it, expect } from "vitest";
import {
  parseCollectionIcon,
  renderCollectionIcon,
  createIconValue,
  getIconSvg,
  DEFAULT_ICON_NAME,
  DEFAULT_ICON_COLOR,
} from "../icons.js";

describe("icons", () => {
  describe("getIconSvg", () => {
    it("returns SVG for a valid icon name", () => {
      const svg = getIconSvg("library");
      expect(svg).toContain("<svg");
      expect(svg).toContain("lucide-library");
    });

    it("handles multi-word kebab-case names", () => {
      const svg = getIconSvg("book-open");
      expect(svg).toContain("<svg");
      expect(svg).toContain("lucide-book-open");
    });

    it("returns null for unknown icon names", () => {
      expect(getIconSvg("nonexistent-icon-xyz")).toBeNull();
    });
  });

  describe("parseCollectionIcon", () => {
    it("parses valid JSON icon data", () => {
      const json = JSON.stringify({
        name: "library",
        svg: "<svg>test</svg>",
        color: "#3b82f6",
      });
      const result = parseCollectionIcon(json);
      expect(result).toEqual({
        name: "library",
        svg: "<svg>test</svg>",
        color: "#3b82f6",
      });
    });

    it("returns null for null input", () => {
      expect(parseCollectionIcon(null)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseCollectionIcon("")).toBeNull();
    });

    it("returns null for legacy emoji values", () => {
      expect(parseCollectionIcon("📚")).toBeNull();
    });

    it("returns null for legacy text values", () => {
      expect(parseCollectionIcon("laptop")).toBeNull();
    });

    it("returns null for malformed JSON", () => {
      expect(parseCollectionIcon("{invalid}")).toBeNull();
    });

    it("returns null for JSON missing required fields", () => {
      expect(parseCollectionIcon('{"name":"library"}')).toBeNull();
      expect(
        parseCollectionIcon('{"name":"library","svg":"<svg>"}'),
      ).toBeNull();
    });

    it("returns null for JSON with wrong field types", () => {
      expect(
        parseCollectionIcon('{"name":123,"svg":"<svg>","color":"#fff"}'),
      ).toBeNull();
    });
  });

  describe("createIconValue", () => {
    it("creates a JSON string with name, svg, and color", () => {
      const result = createIconValue("library", "<svg>test</svg>", "#3b82f6");
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({
        name: "library",
        svg: "<svg>test</svg>",
        color: "#3b82f6",
      });
    });

    it("round-trips through parseCollectionIcon", () => {
      const value = createIconValue("star", "<svg>star</svg>", "#f59e0b");
      const parsed = parseCollectionIcon(value);
      expect(parsed).toEqual({
        name: "star",
        svg: "<svg>star</svg>",
        color: "#f59e0b",
      });
    });
  });

  describe("renderCollectionIcon", () => {
    it("renders structured icon with color and size", () => {
      const icon = createIconValue(
        "library",
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M1 1"/></svg>',
        "#3b82f6",
      );
      const html = renderCollectionIcon(icon, { size: 16 });
      expect(html).toContain('width="16"');
      expect(html).toContain('height="16"');
      expect(html).toContain("color: #3b82f6");
    });

    it("renders legacy emoji as a span", () => {
      const html = renderCollectionIcon("📚");
      expect(html).toBe("<span>📚</span>");
    });

    it("renders legacy text as escaped span", () => {
      const html = renderCollectionIcon("laptop");
      expect(html).toBe("<span>laptop</span>");
    });

    it("escapes HTML in legacy text values", () => {
      const html = renderCollectionIcon('<script>alert("xss")</script>');
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("returns empty string for null without fallback", () => {
      expect(renderCollectionIcon(null)).toBe("");
    });

    it("renders default icon for null with fallback", () => {
      const html = renderCollectionIcon(null, { fallback: true });
      expect(html).toContain("<svg");
      expect(html).toContain(DEFAULT_ICON_COLOR);
    });

    it("uses default size of 24", () => {
      const icon = createIconValue(
        "star",
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M1 1"/></svg>',
        "#f59e0b",
      );
      const html = renderCollectionIcon(icon);
      expect(html).toContain('width="24"');
      expect(html).toContain('height="24"');
    });
  });

  describe("backward compatibility", () => {
    it("handles icon field containing plain emoji from older data", () => {
      // Old collections might have icon: "🎵" stored directly
      const parsed = parseCollectionIcon("🎵");
      expect(parsed).toBeNull();

      const html = renderCollectionIcon("🎵");
      expect(html).toBe("<span>🎵</span>");
    });

    it("handles icon field containing text from older data", () => {
      // Old collections might have icon: "laptop" stored directly
      const parsed = parseCollectionIcon("laptop");
      expect(parsed).toBeNull();

      const html = renderCollectionIcon("laptop");
      expect(html).toBe("<span>laptop</span>");
    });
  });

  describe("constants", () => {
    it("DEFAULT_ICON_NAME is a valid icon", () => {
      const svg = getIconSvg(DEFAULT_ICON_NAME);
      expect(svg).toContain("<svg");
    });
  });
});
