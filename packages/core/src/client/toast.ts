/**
 * Toast Utility
 *
 * Shared showToast() for all client-side bridge modules.
 * Appends a temporary notification to `#toast-container`.
 */

/** Ensure the toast container is in the top layer (above <dialog> etc.) */
function ensureTopLayer(container: HTMLElement): void {
  if (!container.matches(":popover-open")) {
    container.showPopover();
  }
}

const TOAST_ICONS = {
  success:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  error:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
};

/** Build toast inner content using safe DOM APIs (icon is trusted, text uses textContent). */
function setToastContent(
  toast: HTMLElement,
  type: "success" | "error",
  message: string,
  action?: { label: string; href: string },
): void {
  toast.innerHTML = TOAST_ICONS[type];
  const span = document.createElement("span");
  span.textContent = message;
  toast.appendChild(span);
  if (action) {
    const a = document.createElement("a");
    a.href = action.href;
    a.className = "toast-action";
    a.textContent = action.label;
    toast.appendChild(a);
  }
}

/**
 * Show a toast notification.
 *
 * @param message - Text to display
 * @param type - Visual style: "success" (default) or "error"
 *
 * @example
 * showToast("Saved successfully.");
 * showToast("Something went wrong", "error");
 */
export function showToast(
  message: string,
  type: "success" | "error" = "success",
): void {
  if (!message) return;

  const container = document.getElementById("toast-container");
  if (!container) return;

  ensureTopLayer(container);

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  setToastContent(toast, type, message);
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}

/**
 * Show a toast with an action link.
 *
 * @param message - Text to display
 * @param action - Action link with label and href
 * @param type - Visual style: "success" (default) or "error"
 *
 * @example
 * showToastWithAction("Post published.", { label: "View", href: "/p/abc" });
 */
export function showToastWithAction(
  message: string,
  action: { label: string; href: string },
  type: "success" | "error" = "success",
): void {
  if (!message) return;

  const container = document.getElementById("toast-container");
  if (!container) return;

  ensureTopLayer(container);

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  setToastContent(toast, type, message, action);
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}

/**
 * Show a persistent toast that stays until explicitly dismissed.
 *
 * @param id - Unique identifier for updating/dismissing later
 * @param message - Text to display
 * @param type - Visual style: "success" (default) or "error"
 * @returns The toast element
 *
 * @example
 * showPersistentToast("upload", "Uploading...");
 */
export function showPersistentToast(
  id: string,
  message: string,
  type: "success" | "error" = "success",
): HTMLElement | null {
  const container = document.getElementById("toast-container");
  if (!container) return null;

  ensureTopLayer(container);

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.id = `toast-${id}`;
  setToastContent(toast, type, message);
  container.appendChild(toast);

  return toast;
}

/**
 * Update the message of an existing persistent toast.
 *
 * @param id - The toast identifier
 * @param message - New message text
 *
 * @example
 * updateToast("upload", "Almost done...");
 */
export function updateToast(id: string, message: string): void {
  const toast = document.getElementById(`toast-${id}`);
  if (!toast) return;

  const span = toast.querySelector("span");
  if (span) span.textContent = message;
}

/**
 * Dismiss a persistent toast with fadeout animation.
 *
 * @param id - The toast identifier
 *
 * @example
 * dismissToast("upload");
 */
export function dismissToast(id: string): void {
  const toast = document.getElementById(`toast-${id}`);
  if (!toast) return;

  toast.classList.add("toast-out");
  toast.addEventListener("animationend", () => toast.remove());
}

/**
 * Replace a persistent toast with an auto-dismissing one.
 *
 * @param id - The toast identifier
 * @param message - New message text
 * @param type - Visual style: "success" (default) or "error"
 *
 * @example
 * replaceWithAutoClose("upload", "Published!", "success");
 */
export function replaceWithAutoClose(
  id: string,
  message: string,
  type: "success" | "error" = "success",
): void {
  const toast = document.getElementById(`toast-${id}`);
  if (!toast) {
    showToast(message, type);
    return;
  }

  toast.className = `toast toast-${type}`;
  toast.replaceChildren();
  setToastContent(toast, type, message);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}

/**
 * Replace a persistent toast with an auto-dismissing one that has an action link.
 *
 * @param id - The toast identifier
 * @param message - New message text
 * @param action - Action link with label and href
 * @param type - Visual style: "success" (default) or "error"
 *
 * @example
 * replaceWithAutoCloseAction("upload", "Post published.", { label: "View", href: "/p/abc" });
 */
export function replaceWithAutoCloseAction(
  id: string,
  message: string,
  action: { label: string; href: string },
  type: "success" | "error" = "success",
): void {
  const toast = document.getElementById(`toast-${id}`);
  if (!toast) {
    showToastWithAction(message, action, type);
    return;
  }

  toast.className = `toast toast-${type}`;
  toast.replaceChildren();
  setToastContent(toast, type, message, action);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}
