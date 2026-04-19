import { describe, expect, it } from "vitest";
import { hasKnownProvider, resolveEmbed } from "../embed-providers.js";

describe("resolveEmbed", () => {
  it("returns null for empty input", () => {
    expect(resolveEmbed("")).toBeNull();
    expect(resolveEmbed("   ")).toBeNull();
  });

  it("returns null for invalid URLs", () => {
    expect(resolveEmbed("not a url")).toBeNull();
  });

  it("resolves YouTube watch URLs to nocookie embed", () => {
    const embed = resolveEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(embed).not.toBeNull();
    expect(embed?.provider).toBe("youtube");
    expect(embed?.src).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(embed?.orientation).toBe("landscape");
    expect(embed?.cspFrameSrc).toContain("https://www.youtube-nocookie.com");
  });

  it("preserves the YouTube start timestamp from ?t=", () => {
    const embed = resolveEmbed(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42",
    );
    expect(embed?.src).toContain("?start=42");
  });

  it("parses youtu.be timestamps in h/m/s form", () => {
    const embed = resolveEmbed("https://youtu.be/dQw4w9WgXcQ?t=1m30s");
    expect(embed?.src).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90",
    );
  });

  it("treats YouTube Shorts as portrait", () => {
    const embed = resolveEmbed("https://www.youtube.com/shorts/abc123def4");
    expect(embed?.provider).toBe("youtube");
    expect(embed?.orientation).toBe("portrait");
  });

  it("resolves Vimeo URLs", () => {
    const embed = resolveEmbed("https://vimeo.com/123456789");
    expect(embed?.provider).toBe("vimeo");
    expect(embed?.src).toBe("https://player.vimeo.com/video/123456789");
  });

  it("includes the unlisted-link hash for Vimeo", () => {
    const embed = resolveEmbed("https://vimeo.com/123456789/abcdef0123");
    expect(embed?.src).toBe(
      "https://player.vimeo.com/video/123456789?h=abcdef0123",
    );
  });

  it("resolves Spotify track URLs to embed iframe", () => {
    const embed = resolveEmbed(
      "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh",
    );
    expect(embed?.provider).toBe("spotify");
    expect(embed?.src).toBe(
      "https://open.spotify.com/embed/track/4iV5W9uYEdYUVa79Axb7Rh",
    );
    expect(embed?.heightPx).toBe(152);
  });

  it("resolves CodePen pen URLs", () => {
    const embed = resolveEmbed("https://codepen.io/owen/pen/PNaGbb");
    expect(embed?.provider).toBe("codepen");
    expect(embed?.src).toContain("codepen.io/owen/embed/PNaGbb");
  });

  it("falls back to a sandboxed generic iframe for unknown HTTPS URLs", () => {
    const embed = resolveEmbed("https://example.com/some-page");
    expect(embed?.provider).toBe("iframe");
    expect(embed?.providerName).toBe("example.com");
    expect(embed?.sandbox).toContain("allow-scripts");
    expect(embed?.cspFrameSrc).toEqual(["https://example.com"]);
  });

  it("rejects http://-only URLs from the iframe fallback", () => {
    expect(resolveEmbed("http://example.com")).toBeNull();
  });
});

describe("hasKnownProvider", () => {
  it("is true for first-class providers", () => {
    expect(
      hasKnownProvider("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe(true);
    expect(hasKnownProvider("https://vimeo.com/123456789")).toBe(true);
  });

  it("is false for the generic iframe fallback", () => {
    expect(hasKnownProvider("https://example.com")).toBe(false);
  });

  it("is false for invalid input", () => {
    expect(hasKnownProvider("nonsense")).toBe(false);
    expect(hasKnownProvider("")).toBe(false);
  });
});
