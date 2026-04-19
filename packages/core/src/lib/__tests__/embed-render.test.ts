import { describe, expect, it } from "vitest";
import { renderEmbedFigure, renderEmbedFromAttrs } from "../embed-render.js";
import { resolveEmbed } from "../embed-providers.js";

describe("renderEmbedFigure", () => {
  it("renders a sandboxed iframe with provider data attrs", () => {
    const embed = resolveEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(embed).not.toBeNull();
    const html = renderEmbedFigure(embed!);
    expect(html).toContain('class="tiptap-embed-figure"');
    expect(html).toContain('data-provider="youtube"');
    expect(html).toContain('data-orientation="landscape"');
    expect(html).toContain(
      'src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"',
    );
    expect(html).toContain("sandbox=");
    expect(html).toContain('class="tiptap-embed-fallback"');
  });

  it("includes the caption when provided", () => {
    const embed = resolveEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    const html = renderEmbedFigure(embed!, "Rickroll");
    expect(html).toContain("<figcaption>Rickroll</figcaption>");
  });

  it("escapes caption text", () => {
    const embed = resolveEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    const html = renderEmbedFigure(embed!, "<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderEmbedFromAttrs", () => {
  it("trusts persisted src so old posts keep rendering", () => {
    const html = renderEmbedFromAttrs({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      provider: "youtube",
      providerName: "YouTube",
      orientation: "landscape",
      sandbox: "allow-scripts",
    });
    expect(html).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(html).toContain('data-provider="youtube"');
  });

  it("falls back to the provider table when only url is stored", () => {
    const html = renderEmbedFromAttrs({
      url: "https://vimeo.com/123456789",
    });
    expect(html).toContain("player.vimeo.com/video/123456789");
    expect(html).toContain('data-provider="vimeo"');
  });

  it("returns an empty string when attrs are missing entirely", () => {
    expect(renderEmbedFromAttrs(undefined)).toBe("");
    expect(renderEmbedFromAttrs({})).toBe("");
  });
});
