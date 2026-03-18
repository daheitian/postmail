// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { getFloatingPosition } from "../floating-position.js";

describe("getFloatingPosition", () => {
  const containerRect = {
    left: 100,
    top: 50,
    width: 320,
    height: 240,
  };

  it("flips below the anchor when there is not enough room above", () => {
    const layout = getFloatingPosition({
      anchorRect: {
        left: 180,
        right: 240,
        top: 70,
        bottom: 90,
      },
      containerRect,
      floatingWidth: 120,
      floatingHeight: 48,
      preferredPlacement: "top",
      fallbackPlacement: "bottom",
      align: "center",
    });

    expect(layout.placement).toBe("bottom");
    expect(layout.top).toBeGreaterThanOrEqual(48);
  });

  it("clamps centered overlays within the container width", () => {
    const layout = getFloatingPosition({
      anchorRect: {
        left: 108,
        right: 130,
        top: 170,
        bottom: 190,
      },
      containerRect,
      floatingWidth: 180,
      floatingHeight: 40,
      preferredPlacement: "top",
      fallbackPlacement: "bottom",
      align: "center",
    });

    expect(layout.left).toBe(8);
  });

  it("returns a constrained max height when the popup is taller than the space", () => {
    const layout = getFloatingPosition({
      anchorRect: {
        left: 180,
        right: 180,
        top: 250,
        bottom: 270,
      },
      containerRect,
      floatingWidth: 160,
      floatingHeight: 220,
      preferredPlacement: "bottom",
      fallbackPlacement: "top",
      align: "start",
      gap: 4,
    });

    expect(layout.placement).toBe("top");
    expect(layout.maxHeight).toBe(188);
    expect(layout.top).toBe(8);
  });
});
