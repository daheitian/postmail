/**
 * Thread Context Interactions
 *
 * 1. The ancestor-context shell is server-rendered in the "collapsed" state
 *    (cap + fade + visible Show more button). For the common case where the
 *    content actually overflows that cap, the server state is already correct
 *    and JS does nothing visual at all — no first-paint reflow. For the rarer
 *    case where the content fits inside the cap (a couple of tiny posts), JS
 *    post-load removes the cap and hides the toggle so the user never sees
 *    a no-op "Show more" button.
 * 2. Handle expand/collapse toggle clicks with a max-height transition.
 * 3. Auto-scroll to current post on thread detail pages.
 */

const OVERFLOW_THRESHOLD_PX = 8;

function parsePixelValue(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCapPx(shell: HTMLElement): number {
  const value = getComputedStyle(shell)
    .getPropertyValue("--site-thread-context-max-height")
    .trim();
  return parsePixelValue(value, 240);
}

function setupShell(toggle: HTMLElement): void {
  if (toggle.dataset.threadContextToggleBound === "1") return;
  toggle.dataset.threadContextToggleBound = "1";

  const shell = toggle.previousElementSibling;
  if (
    !(shell instanceof HTMLElement) ||
    shell.dataset.threadContext === undefined
  ) {
    return;
  }

  const label = toggle.querySelector<HTMLElement>(
    ".thread-context-toggle-label",
  );
  const labelMore = toggle.dataset.labelMore ?? "Show more";
  const labelLess = toggle.dataset.labelLess ?? "Show less";

  let userInteracted = false;

  const setExpandedLabel = (expanded: boolean): void => {
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (label) label.textContent = expanded ? labelLess : labelMore;
  };

  const allImagesSettled = (): boolean =>
    Array.from(shell.querySelectorAll("img")).every((img) => img.complete);

  const evaluate = (): void => {
    // Skip once the user has taken control; their state is intentional.
    if (userInteracted) return;
    const cap = getCapPx(shell);
    // scrollHeight gives the natural content height regardless of whether
    // overflow is currently clipped — valid in collapsed and expanded states.
    const overflows = shell.scrollHeight > cap + OVERFLOW_THRESHOLD_PX;

    if (overflows) {
      // Common case: server state was already correct (cap + fade + button).
      // Restore in case a prior evaluation had hidden anything.
      if (shell.dataset.collapsed === undefined) shell.dataset.collapsed = "";
      toggle.hidden = false;
      setExpandedLabel(false);
    } else if (allImagesSettled()) {
      // Only hide once we're sure nothing pending will grow the shell.
      // Hiding while an image is mid-download would briefly remove the
      // button, and the user could click the spot where it just was.
      delete shell.dataset.collapsed;
      toggle.hidden = true;
    }
  };

  evaluate();

  shell.querySelectorAll("img").forEach((img) => {
    if (img.complete) return;
    img.addEventListener("load", evaluate, { once: true });
    img.addEventListener("error", evaluate, { once: true });
  });

  if ("ResizeObserver" in globalThis) {
    let raf = 0;
    const observer = new globalThis.ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(evaluate);
    });
    observer.observe(shell);
  }

  // Per-click cleanup that fires when max-height settles. The shell's
  // descendants (the fade overlay) also transition, and their transitionend
  // events bubble to the shell — we have to filter by propertyName or
  // cleanup runs early and the animation snaps. Multiple cleanups can stack
  // safely because each is self-removing and idempotent.
  const scheduleCleanup = (): void => {
    let done = false;
    const cleanup = (e?: globalThis.TransitionEvent): void => {
      if (done) return;
      if (e && e.propertyName !== "max-height") return;
      done = true;
      shell.removeEventListener("transitionend", cleanup);
      if (shell.dataset.collapsed === undefined) shell.style.maxHeight = "";
    };
    shell.addEventListener("transitionend", cleanup);
    window.setTimeout(cleanup, 600);
  };

  toggle.addEventListener("click", () => {
    userInteracted = true;
    const collapsed = shell.dataset.collapsed !== undefined;

    if (collapsed) {
      // Expand: pin to the natural content height so the transition has a
      // concrete target, then drop the cap.
      shell.style.maxHeight = `${shell.scrollHeight}px`;
      void shell.offsetHeight;
      delete shell.dataset.collapsed;
      setExpandedLabel(true);
    } else {
      // Collapse: pin to the current height, then on the next frame restore
      // the cap so the transition animates back down.
      shell.style.maxHeight = `${shell.scrollHeight}px`;
      void shell.offsetHeight;
      requestAnimationFrame(() => {
        shell.dataset.collapsed = "";
        shell.style.maxHeight = "";
      });
      setExpandedLabel(false);
    }
    scheduleCleanup();
  });
}

export function setupThreadContexts(
  root: globalThis.Document | globalThis.Element = document,
): void {
  root
    .querySelectorAll<HTMLElement>("[data-thread-context-toggle]")
    .forEach(setupShell);
}

function isFirstThreadDetailItem(current: HTMLElement): boolean {
  const group = current.closest<HTMLElement>(".thread-group-detail");
  if (!group) return false;

  const firstItem = group.querySelector<HTMLElement>(".thread-detail-item");
  return firstItem === current;
}

function isContinueHash(): boolean {
  return globalThis.location.hash === "#continue";
}

function scrollCurrentDetailPostIntoView(
  root: globalThis.Document | globalThis.Element = document,
): void {
  const current = root.querySelector("[data-post-current]");
  if (!(current instanceof HTMLElement)) return;

  const continueHash = isContinueHash();

  // Explicit hashes still win, except for #continue on thread detail pages.
  if (globalThis.location.hash && !continueHash) return;

  const scrollBehavior = continueHash ? "auto" : "smooth";
  const isFirstItem = isFirstThreadDetailItem(current);

  requestAnimationFrame(() => {
    // Root posts should stay at the top, but #continue deep-links need to be
    // reset because permalink thread pages should open at the current post start.
    if (isFirstItem && !continueHash) return;

    current.scrollIntoView({ behavior: scrollBehavior, block: "start" });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupThreadContexts(document);
  scrollCurrentDetailPostIntoView(document);
});

export const __testOnly = {
  isFirstThreadDetailItem,
  scrollCurrentDetailPostIntoView,
};
