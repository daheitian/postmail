interface FloatingAnchorRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface FloatingContainerRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FloatingPositionOptions {
  anchorRect: FloatingAnchorRect;
  containerRect: FloatingContainerRect;
  floatingWidth: number;
  floatingHeight: number;
  preferredPlacement: "top" | "bottom";
  fallbackPlacement?: "top" | "bottom";
  align: "center" | "start";
  gap?: number;
  padding?: number;
}

export interface FloatingPositionResult {
  left: number;
  top: number;
  placement: "top" | "bottom";
  maxHeight: number | null;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function getAvailableSpace(
  placement: "top" | "bottom",
  anchorRect: FloatingAnchorRect,
  containerRect: FloatingContainerRect,
  gap: number,
  padding: number,
): number {
  const containerTop = containerRect.top;
  const containerBottom = containerRect.top + containerRect.height;

  if (placement === "top") {
    return Math.max(anchorRect.top - containerTop - gap - padding, 0);
  }

  return Math.max(containerBottom - anchorRect.bottom - gap - padding, 0);
}

/**
 * Returns the viewport-relative bounds for a fixed-position floating surface.
 *
 * @param container - Fixed-position containing element, usually a dialog
 * @returns Rectangle in viewport coordinates
 *
 * @example
 * const rect = getFixedFloatingContainerRect(dialogEl);
 */
export function getFixedFloatingContainerRect(
  container: HTMLElement | null,
): FloatingContainerRect {
  if (!container || container === document.body) {
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  const rect = container.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Computes a bounded position for floating editor UI inside a dialog-sized
 * fixed-position container.
 *
 * @param options - Anchor, container, and sizing information
 * @returns Position, placement, and constrained max height
 *
 * @example
 * const layout = getFloatingPosition({
 *   anchorRect: { left: 100, right: 160, top: 200, bottom: 220 },
 *   containerRect: getFixedFloatingContainerRect(dialogEl),
 *   floatingWidth: 180,
 *   floatingHeight: 48,
 *   preferredPlacement: "top",
 *   fallbackPlacement: "bottom",
 *   align: "center",
 * });
 */
export function getFloatingPosition(
  options: FloatingPositionOptions,
): FloatingPositionResult {
  const gap = options.gap ?? 8;
  const padding = options.padding ?? 8;
  const fallbackPlacement =
    options.fallbackPlacement ??
    (options.preferredPlacement === "top" ? "bottom" : "top");

  const preferredSpace = getAvailableSpace(
    options.preferredPlacement,
    options.anchorRect,
    options.containerRect,
    gap,
    padding,
  );
  const fallbackSpace = getAvailableSpace(
    fallbackPlacement,
    options.anchorRect,
    options.containerRect,
    gap,
    padding,
  );

  const placement =
    options.floatingHeight <= preferredSpace || preferredSpace >= fallbackSpace
      ? options.preferredPlacement
      : fallbackPlacement;
  const availableSpace =
    placement === options.preferredPlacement ? preferredSpace : fallbackSpace;
  const maxHeight =
    availableSpace > 0 && options.floatingHeight > availableSpace
      ? availableSpace
      : null;
  const usedHeight = maxHeight ?? options.floatingHeight;

  const desiredLeft =
    options.align === "center"
      ? (options.anchorRect.left + options.anchorRect.right) / 2 -
        options.floatingWidth / 2
      : options.anchorRect.left;
  const minLeft = padding;
  const maxLeft = options.containerRect.width - options.floatingWidth - padding;
  const left = clamp(
    desiredLeft - options.containerRect.left,
    minLeft,
    maxLeft,
  );

  const desiredTop =
    placement === "top"
      ? options.anchorRect.top - options.containerRect.top - usedHeight - gap
      : options.anchorRect.bottom - options.containerRect.top + gap;
  const minTop = padding;
  const maxTop = options.containerRect.height - usedHeight - padding;
  const top = clamp(desiredTop, minTop, maxTop);

  return {
    left,
    top,
    placement,
    maxHeight,
  };
}
