import { describe, expect, it } from "vitest";
import {
  collectMediaReferences,
  extractAttachmentBlocks,
  findImageUrls,
  normalizeImportedBody,
  rewriteMediaReferences,
} from "../../bin/lib/site-media-parser.js";

describe("site-media-parser", () => {
  it("collects markdown, reference-style, html, and attachment metadata refs", () => {
    const content = `
![hero](/media/hero.webp)
![ref hero][hero-ref]

[hero-ref]: ./media/ref-hero.webp "Hero"

<img src="/media/inline.png" alt="">
<video poster="/media/poster.webp"><source src="/media/video.mp4"></video>
<audio src="/media/audio.mp3"></audio>

<div data-jant-node="attachments">
  <figure data-jant-node="attachment">
    <script type="application/json" data-jant-meta>{"src":"/media/report.pdf","poster":"/media/report-poster.webp"}</script>
    <a href="/media/report.pdf">report.pdf</a>
  </figure>
</div>
`;

    expect(collectMediaReferences(content)).toEqual([
      "/media/hero.webp",
      "./media/ref-hero.webp",
      "/media/inline.png",
      "/media/audio.mp3",
      "/media/video.mp4",
      "/media/poster.webp",
      "/media/report.pdf",
      "/media/report-poster.webp",
    ]);
  });

  it("rewrites only discovered media refs and leaves code fences alone", () => {
    const content = `
![hero](/media/hero.webp)
![ref hero][hero-ref]

[hero-ref]: ./media/ref-hero.webp "Hero"

<div data-jant-node="attachments">
  <figure data-jant-node="attachment">
    <script type="application/json" data-jant-meta>{"src":"/media/report.pdf","poster":"/media/report-poster.webp"}</script>
    <a href="/media/report.pdf">report.pdf</a>
    <img src="/media/report-poster.webp" alt="">
  </figure>
</div>

\`\`\`md
![not-rewritten](/media/code.webp)
\`\`\`
`;

    const rewritten = rewriteMediaReferences(
      content,
      new Map([
        ["/media/hero.webp", "/static/media/hero.webp"],
        ["./media/ref-hero.webp", "/static/media/ref-hero.webp"],
        ["/media/report.pdf", "/static/media/report.pdf"],
        ["/media/report-poster.webp", "/static/media/report-poster.webp"],
      ]),
    );

    expect(rewritten).toContain("![hero](/static/media/hero.webp)");
    expect(rewritten).toContain("[hero-ref]: /static/media/ref-hero.webp");
    expect(rewritten).toContain('"src":"/static/media/report.pdf"');
    expect(rewritten).toContain('"poster":"/static/media/report-poster.webp"');
    expect(rewritten).toContain('<a href="/static/media/report.pdf">');
    expect(rewritten).toContain('<img src="/static/media/report-poster.webp"');
    expect(rewritten).toContain("![not-rewritten](/media/code.webp)");
  });

  it("finds inline images from markdown, html, and reference definitions", () => {
    const content = `
![hero](/media/hero.webp)
![ref hero][hero-ref]

[hero-ref]: ./media/ref-hero.webp "Hero"

<img src="/media/inline.png" alt="">

\`\`\`md
![not-an-image](/media/code.webp)
\`\`\`
`;

    expect(findImageUrls(content)).toEqual([
      "/media/hero.webp",
      "./media/ref-hero.webp",
      "/media/inline.png",
    ]);
  });

  it("extracts Jant attachment blocks and leaves surrounding markdown intact", () => {
    const result = extractAttachmentBlocks(`
Before

<div data-jant-node="attachments">
  <figure data-jant-node="attachment">
    <script type="application/json" data-jant-meta>{"kind":"image","src":"/media/photo.webp","alt":"Photo"}</script>
    <img src="/media/photo.webp" alt="Photo">
  </figure>
  <figure data-jant-node="attachment">
    <script type="application/json" data-jant-meta>{"kind":"text","contentFormat":"markdown","content":"# Attached note\\n\\nHello import"}</script>
  </figure>
</div>

After
`);

    expect(result.markdown).toBe("Before\n\nAfter");
    expect(result.attachments).toEqual([
      {
        kind: "image",
        src: "/media/photo.webp",
        alt: "Photo",
      },
      {
        kind: "text",
        contentFormat: "markdown",
        content: "# Attached note\n\nHello import",
      },
    ]);
  });

  it("normalizes standalone image html into Jant image markup", () => {
    const result = normalizeImportedBody(`
Before

<figure>
  <a href="https://example.com/source">
    <img src="/media/photo.webp" alt="Photo" title="Title">
  </a>
  <figcaption>Caption</figcaption>
</figure>

After
`);

    expect(result).toEqual({
      markdown:
        'Before\n\n<figure data-jant-node="image"><a href="https://example.com/source"><img src="/media/photo.webp" alt="Photo" title="Title"></a><figcaption>Caption</figcaption></figure>\n\nAfter',
      attachments: [],
    });
  });

  it("normalizes inline html images into markdown images", () => {
    const result = normalizeImportedBody(
      'Before <img src="/media/photo.webp" alt="Photo" title="Title"> after',
    );

    expect(result).toEqual({
      markdown: 'Before ![Photo](/media/photo.webp "Title") after',
      attachments: [],
    });
  });

  it("converts standalone audio and video html into imported attachments", () => {
    const result = normalizeImportedBody(`
Intro

<figure>
  <video controls poster="/media/video-poster.webp">
    <source src="/media/video.mp4" type="video/mp4">
  </video>
  <figcaption>Video caption</figcaption>
</figure>

<audio controls src="/media/audio.mp3"></audio>
`);

    expect(result).toEqual({
      markdown: "Intro",
      attachments: [
        {
          kind: "video",
          src: "/media/video.mp4",
          poster: "/media/video-poster.webp",
          summary: "Video caption",
        },
        {
          kind: "audio",
          src: "/media/audio.mp3",
        },
      ],
    });
  });
});
