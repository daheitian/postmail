/**
 * Post Form Bridge
 *
 * Connects <jant-post-form> to the server by handling:
 * - `jant:post-submit` → POST JSON and redirect on success
 * - `jant:post-load-media` → fetch media picker HTML and manage selections
 */

import type {
  PostSubmitDetail,
  PostFormLabels,
} from "./components/post-form-types.js";
import type { JantPostForm } from "./components/jant-post-form.js";
import { getJsonString, readJsonObject } from "./json.js";
import { queueToastForNextPage, showToast } from "./toast.js";

function findPostForm(
  target: globalThis.EventTarget | null,
): JantPostForm | null {
  if (target instanceof HTMLElement && target.tagName === "JANT-POST-FORM") {
    return target as JantPostForm;
  }
  if (target instanceof HTMLElement) {
    return target.closest("jant-post-form") as JantPostForm | null;
  }
  return document.querySelector("jant-post-form");
}

function applyMediaSelection(el: HTMLElement, selected: boolean) {
  el.classList.toggle("ring-2", selected);
  el.classList.toggle("ring-primary", selected);
  el.classList.toggle("border-primary", selected);
}

async function handlePostSubmit(event: Event) {
  const customEvent = event as CustomEvent<PostSubmitDetail>;
  const detail = customEvent.detail;
  if (!detail) return;

  const formEl = findPostForm(customEvent.target);
  if (!formEl || !detail.endpoint) return;

  formEl.loading = true;

  try {
    const res = await fetch(detail.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(detail.data),
    });

    if (!res.ok) {
      let message = detail.messages.error;
      try {
        const json = await readJsonObject(res);
        message =
          getJsonString(json, "error") ??
          getJsonString(json, "message") ??
          message;
      } catch {
        // Ignore JSON parse failure; keep fallback message.
      }

      // Auto-save as draft when a new publish fails
      if (detail.data.status === "published" && !detail.isEdit) {
        try {
          const retryRes = await fetch(detail.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ ...detail.data, status: "draft" }),
          });

          if (retryRes.ok) {
            const retryJson = await readJsonObject(retryRes);
            const labelsAttr = formEl.getAttribute("labels");
            let fallbackMsg = "Couldn't publish. Saved as draft.";
            if (labelsAttr) {
              try {
                const parsed = JSON.parse(
                  labelsAttr,
                ) as Partial<PostFormLabels>;
                if (parsed.draftFallbackMessage)
                  fallbackMsg = parsed.draftFallbackMessage;
              } catch {
                // Ignore parse failure; use default message
              }
            }

            const retryStatus = getJsonString(retryJson, "status");
            const retryUrl = getJsonString(retryJson, "url");
            if (retryStatus === "redirect" && retryUrl) {
              formEl.clearDirty();
              queueToastForNextPage(fallbackMsg);
              window.location.href = retryUrl;
              return;
            }
            showToast(fallbackMsg);
            formEl.clearDirty();
            return;
          }
        } catch {
          // Retry failed — fall through to show original error
        }
      }

      throw new Error(message);
    }

    const json = await readJsonObject(res);
    const status = getJsonString(json, "status");
    const url = getJsonString(json, "url");

    if (status === "redirect" && url) {
      formEl.clearDirty();
      queueToastForNextPage(detail.messages.success);
      window.location.href = url;
      return;
    }

    formEl.clearDirty();
    showToast(detail.messages.success);
  } catch (err) {
    const message =
      err instanceof Error && err.message ? err.message : detail.messages.error;
    showToast(message, "error");
  } finally {
    formEl.loading = false;
  }
}

async function handleMediaLoad(event: Event) {
  const customEvent = event as CustomEvent<{
    endpoint: string;
    selectedIds: string[];
  }>;
  const detail = customEvent.detail;
  if (!detail?.endpoint) return;

  const grid = document.getElementById("post-media-grid");
  const formEl = findPostForm(customEvent.target);
  if (!grid || !formEl) return;

  try {
    grid.innerHTML =
      '<p class="text-muted-foreground text-sm col-span-4">Loading...</p>';

    const res = await fetch(detail.endpoint, {
      headers: { Accept: "text/html" },
    });
    const html = await res.text();
    grid.innerHTML = html;
  } catch {
    grid.innerHTML =
      '<p class="text-red-500 text-sm col-span-4">Failed to load media.</p>';
    return;
  }

  const selected = new Set(detail.selectedIds);

  grid.querySelectorAll<HTMLElement>("[data-media-id]").forEach((el) => {
    const id = el.dataset.mediaId;
    if (!id) return;
    applyMediaSelection(el, selected.has(id));
  });

  grid.onclick = (e: Event) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-media-id]",
    );
    if (!target) return;
    const id = target.dataset.mediaId;
    if (!id) return;

    const current = new Set(formEl.mediaIds);
    if (current.has(id)) {
      current.delete(id);
      applyMediaSelection(target, false);
    } else {
      current.add(id);
      applyMediaSelection(target, true);
    }
    formEl.mediaIds = [...current];
  };
}

document.addEventListener("jant:post-submit", handlePostSubmit);
document.addEventListener("jant:post-load-media", handleMediaLoad);
