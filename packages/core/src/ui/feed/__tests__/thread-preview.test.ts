import { describe, expect, it } from "vitest";
import { getThreadPreviewState } from "../thread-preview-state.js";

describe("getThreadPreviewState", () => {
  it("does not show the toggle for a 2-post thread", () => {
    expect(
      getThreadPreviewState({
        hasParentReply: false,
        totalReplyCount: 1,
      }),
    ).toEqual({
      hiddenCount: 0,
      shouldShowToggle: false,
    });
  });

  it("shows the toggle for a 3-post thread with no hidden ancestors", () => {
    expect(
      getThreadPreviewState({
        hasParentReply: true,
        totalReplyCount: 2,
      }),
    ).toEqual({
      hiddenCount: 0,
      shouldShowToggle: true,
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
      shouldShowToggle: true,
    });
  });
});
