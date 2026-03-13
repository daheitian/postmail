import { describe, expect, it } from "vitest";
import { getThreadPreviewState } from "../thread-preview-state.js";

describe("getThreadPreviewState", () => {
  it("has no hidden ancestors for a 2-post thread", () => {
    expect(
      getThreadPreviewState({
        hasParentReply: false,
        totalReplyCount: 1,
      }),
    ).toEqual({
      hiddenCount: 0,
    });
  });

  it("has no hidden ancestors for a 3-post thread with parent context", () => {
    expect(
      getThreadPreviewState({
        hasParentReply: true,
        totalReplyCount: 2,
      }),
    ).toEqual({
      hiddenCount: 0,
    });
  });

  it("counts hidden ancestors for longer threads", () => {
    expect(
      getThreadPreviewState({
        hasParentReply: true,
        totalReplyCount: 5,
      }),
    ).toEqual({
      hiddenCount: 3,
    });
  });
});
