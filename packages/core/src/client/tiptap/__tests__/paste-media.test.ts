// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { getClipboardFiles } from "../paste-media.js";

describe("getClipboardFiles", () => {
  it("falls back to clipboardData.files when browsers omit item entries", () => {
    const image = new File(["image"], "clipboard.png", { type: "image/png" });
    const video = new File(["video"], "clipboard.mp4", { type: "video/mp4" });

    const files = getClipboardFiles({
      files: [image, video],
    });

    expect(files).toEqual([image, video]);
  });

  it("deduplicates files when clipboard items repeat the same payload", () => {
    const image = new File(["image"], "clipboard.png", { type: "image/png" });

    const files = getClipboardFiles({
      items: [
        {
          kind: "file",
          type: image.type,
          getAsFile: () => image,
        },
        {
          kind: "file",
          type: image.type,
          getAsFile: () => image,
        },
      ],
      files: [image],
    });

    expect(files).toEqual([image]);
  });
});
