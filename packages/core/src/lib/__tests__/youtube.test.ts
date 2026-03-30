import { describe, it, expect } from "vitest";
import {
  extractYouTubeVideoId,
  isYouTubeUrl,
  getYouTubeThumbnailUrls,
} from "../youtube.js";

describe("extractYouTubeVideoId", () => {
  it("extracts from youtube.com/watch?v=", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts from youtube.com/watch with extra params", () => {
    expect(
      extractYouTubeVideoId(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120",
      ),
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts from m.youtube.com", () => {
    expect(
      extractYouTubeVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts from youtu.be short link", () => {
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("extracts from youtu.be with query params", () => {
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=42")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("extracts from youtube.com/shorts/", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts from youtube.com/embed/", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("returns null for non-YouTube URLs", () => {
    expect(extractYouTubeVideoId("https://example.com")).toBeNull();
    expect(extractYouTubeVideoId("https://vimeo.com/12345")).toBeNull();
  });

  it("returns null for youtube.com without video ID", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com")).toBeNull();
    expect(extractYouTubeVideoId("https://www.youtube.com/watch")).toBeNull();
    expect(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=short"),
    ).toBeNull();
  });

  it("returns null for invalid strings", () => {
    expect(extractYouTubeVideoId("not a url")).toBeNull();
    expect(extractYouTubeVideoId("")).toBeNull();
  });

  it("handles IDs with hyphens and underscores", () => {
    expect(extractYouTubeVideoId("https://youtu.be/abc-_def123")).toBe(
      "abc-_def123",
    );
  });
});

describe("isYouTubeUrl", () => {
  it("returns true for YouTube URLs", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      true,
    );
    expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  it("returns false for non-YouTube URLs", () => {
    expect(isYouTubeUrl("https://example.com")).toBe(false);
  });
});

describe("getYouTubeThumbnailUrls", () => {
  it("returns maxresdefault first, hqdefault second", () => {
    const urls = getYouTubeThumbnailUrls("dQw4w9WgXcQ");
    expect(urls).toEqual([
      "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    ]);
  });
});
