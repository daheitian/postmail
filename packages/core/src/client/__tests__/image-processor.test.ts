import { describe, expect, it } from "vitest";
import { planImageProcessing } from "../image-processor.js";

const OPTS = { maxShortSide: 1920, maxLongSide: 8192 };

describe("planImageProcessing", () => {
  it("leaves small images untouched", () => {
    expect(planImageProcessing(800, 600, OPTS)).toEqual({
      passthrough: false,
      width: 800,
      height: 600,
    });
  });

  it("keeps long screenshots at full resolution", () => {
    expect(planImageProcessing(1080, 6000, OPTS)).toEqual({
      passthrough: false,
      width: 1080,
      height: 6000,
    });
  });

  it("keeps wide screenshots at full resolution", () => {
    expect(planImageProcessing(6000, 1080, OPTS)).toEqual({
      passthrough: false,
      width: 6000,
      height: 1080,
    });
  });

  it("downscales a large photo by its short side, not its long side", () => {
    const plan = planImageProcessing(4032, 3024, OPTS);
    expect(plan.passthrough).toBe(false);
    expect(plan.height).toBe(1920);
    expect(plan.width).toBe(Math.round(4032 * (1920 / 3024)));
  });

  it("caps the short side regardless of orientation", () => {
    const portrait = planImageProcessing(3024, 4032, OPTS);
    expect(portrait.width).toBe(1920);
    expect(portrait.height).toBe(Math.round(4032 * (1920 / 3024)));
  });

  it("uploads images taller than the canvas limit untouched", () => {
    expect(planImageProcessing(1080, 12000, OPTS)).toEqual({
      passthrough: true,
      width: 1080,
      height: 12000,
    });
  });

  it("uploads images wider than the canvas limit untouched", () => {
    expect(planImageProcessing(12000, 1080, OPTS)).toEqual({
      passthrough: true,
      width: 12000,
      height: 1080,
    });
  });

  it("treats the long-side cap as inclusive", () => {
    expect(planImageProcessing(1080, 8192, OPTS).passthrough).toBe(false);
    expect(planImageProcessing(1080, 8193, OPTS).passthrough).toBe(true);
  });
});
