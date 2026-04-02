// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { chooseAutoplayVideo } from "../feed-video-player.js";

describe("chooseAutoplayVideo", () => {
  it("prefers the candidate with the largest visible area", () => {
    const winner = chooseAutoplayVideo([
      {
        video: "first",
        intersectionRatio: 0.9,
        visibleArea: 20_000,
        centerDistance: 40,
      },
      {
        video: "second",
        intersectionRatio: 0.8,
        visibleArea: 28_000,
        centerDistance: 80,
      },
    ]);

    expect(winner?.video).toBe("second");
  });

  it("breaks ties by picking the candidate closest to the viewport center", () => {
    const winner = chooseAutoplayVideo([
      {
        video: "first",
        intersectionRatio: 0.8,
        visibleArea: 24_000,
        centerDistance: 120,
      },
      {
        video: "second",
        intersectionRatio: 0.8,
        visibleArea: 24_000,
        centerDistance: 40,
      },
    ]);

    expect(winner?.video).toBe("second");
  });
});
