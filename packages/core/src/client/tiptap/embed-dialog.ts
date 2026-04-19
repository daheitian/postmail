/**
 * Embed Dialog — single entry point for inserting embeds and raw HTML.
 *
 * One slash item ("Embed") opens this dialog. The default mode is URL — paste
 * any link, we resolve it through the provider table. A small "Paste HTML
 * instead" link switches to a raw-HTML mode that emits an `htmlBlock` node.
 *
 * Why one entry point: a second slash item for "raw HTML" tempts authors to
 * use raw HTML for things that should be embeds. One ramp, lower decision
 * cost, the secondary toggle is right there.
 */

import { resolveEmbed } from "../../lib/embed-providers.js";

export type EmbedDialogResult =
  | { kind: "embed"; url: string; caption?: string }
  | { kind: "link"; url: string }
  | { kind: "html"; html: string };

export interface EmbedDialogOptions {
  initialUrl?: string;
  initialHtml?: string;
  initialCaption?: string;
  initialMode?: "url" | "html";
}

/**
 * Open the embed dialog. Returns the chosen value or `null` if cancelled.
 *
 * The dialog is created on demand and torn down on close — there's no
 * persistent DOM. Keyboard: Enter submits, Escape cancels.
 */
export function openEmbedDialog(
  options: EmbedDialogOptions = {},
): Promise<EmbedDialogResult | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "dialog tiptap-embed-dialog";

    const panel = document.createElement("div");
    panel.className = "tiptap-embed-dialog-panel";
    panel.tabIndex = -1;
    dialog.appendChild(panel);

    const title = document.createElement("h2");
    title.className = "tiptap-embed-dialog-title";
    title.textContent = "Insert embed";
    panel.appendChild(title);

    // URL fields
    const urlField = document.createElement("div");
    urlField.className = "tiptap-embed-dialog-field";
    panel.appendChild(urlField);

    const urlLabel = document.createElement("label");
    urlLabel.className = "tiptap-embed-dialog-label";
    urlLabel.textContent = "URL";
    urlField.appendChild(urlLabel);

    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.className = "input tiptap-embed-dialog-input";
    urlInput.placeholder = "https://www.youtube.com/watch?v=…";
    urlInput.value = options.initialUrl ?? "";
    urlLabel.appendChild(urlInput);

    const urlHint = document.createElement("p");
    urlHint.className = "tiptap-embed-dialog-hint";
    urlField.appendChild(urlHint);

    const captionField = document.createElement("div");
    captionField.className = "tiptap-embed-dialog-field";
    panel.appendChild(captionField);

    const captionLabel = document.createElement("label");
    captionLabel.className = "tiptap-embed-dialog-label";
    captionLabel.textContent = "Caption (optional)";
    captionField.appendChild(captionLabel);

    const captionInput = document.createElement("input");
    captionInput.type = "text";
    captionInput.className = "input tiptap-embed-dialog-input";
    captionInput.value = options.initialCaption ?? "";
    captionLabel.appendChild(captionInput);

    // HTML mode field (hidden by default)
    const htmlField = document.createElement("div");
    htmlField.className = "tiptap-embed-dialog-field";
    htmlField.hidden = true;
    panel.appendChild(htmlField);

    const htmlLabel = document.createElement("label");
    htmlLabel.className = "tiptap-embed-dialog-label";
    htmlLabel.textContent = "Raw HTML";
    htmlField.appendChild(htmlLabel);

    const htmlTextarea = document.createElement("textarea");
    htmlTextarea.className = "textarea tiptap-embed-dialog-textarea";
    htmlTextarea.rows = 8;
    htmlTextarea.placeholder =
      '<script data-letterbirduser="you" src="https://letterbird.co/embed/v1.js"></script>';
    htmlTextarea.value = options.initialHtml ?? "";
    htmlLabel.appendChild(htmlTextarea);

    const htmlWarning = document.createElement("p");
    htmlWarning.className = "tiptap-embed-dialog-warning";
    htmlWarning.textContent =
      "Anything you paste here runs in your visitors' browsers. Only use code you trust.";
    htmlField.appendChild(htmlWarning);

    // Mode toggle
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "tiptap-embed-dialog-toggle";
    panel.appendChild(toggle);

    let mode: "url" | "html" = options.initialMode ?? "url";

    function applyMode() {
      if (mode === "url") {
        title.textContent = "Insert embed";
        urlField.hidden = false;
        captionField.hidden = false;
        htmlField.hidden = true;
        toggle.textContent = "Paste raw HTML instead";
      } else {
        title.textContent = "Paste raw HTML";
        urlField.hidden = true;
        captionField.hidden = true;
        htmlField.hidden = false;
        toggle.textContent = "Use a URL instead";
      }
      updateHint();
      updateLinkBtnVisibility();
      queueMicrotask(() => {
        if (mode === "url") urlInput.focus();
        else htmlTextarea.focus();
      });
    }

    function updateHint() {
      if (mode !== "url") {
        urlHint.textContent = "";
        return;
      }
      const value = urlInput.value.trim();
      if (!value) {
        urlHint.textContent =
          "YouTube, Vimeo, Spotify, CodePen, or any HTTPS page.";
        return;
      }
      const resolved = resolveEmbed(value);
      if (!resolved) {
        urlHint.textContent = "Not a valid URL.";
        return;
      }
      urlHint.textContent =
        resolved.provider === "iframe"
          ? `Generic iframe — ${resolved.providerName}`
          : `Detected: ${resolved.providerName}`;
    }

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      mode = mode === "url" ? "html" : "url";
      applyMode();
    });

    urlInput.addEventListener("input", () => {
      updateHint();
      updateLinkBtnVisibility();
    });

    // Footer
    const footer = document.createElement("div");
    footer.className = "tiptap-embed-dialog-actions";
    panel.appendChild(footer);

    // Secondary action: insert as a plain link instead of an embed.
    // Visible only in URL mode and when the URL field has content — the
    // dialog is for embeds first, so we don't surface the link option until
    // the author has typed something they could meaningfully link.
    const linkBtn = document.createElement("button");
    linkBtn.type = "button";
    linkBtn.className = "tiptap-embed-dialog-link-instead";
    linkBtn.textContent = "Insert as link instead";
    linkBtn.addEventListener("click", (event) => {
      event.preventDefault();
      const url = urlInput.value.trim();
      if (!url) {
        urlInput.focus();
        return;
      }
      finish({ kind: "link", url });
    });
    footer.appendChild(linkBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn-outline";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", (event) => {
      event.preventDefault();
      finish(null);
    });
    footer.appendChild(cancelBtn);

    const insertBtn = document.createElement("button");
    insertBtn.type = "button";
    insertBtn.className = "btn";
    insertBtn.textContent = "Insert";
    insertBtn.addEventListener("click", (event) => {
      event.preventDefault();
      submit();
    });
    footer.appendChild(insertBtn);

    function updateLinkBtnVisibility() {
      const hasUrl = mode === "url" && urlInput.value.trim().length > 0;
      linkBtn.hidden = !hasUrl;
    }

    function submit() {
      if (mode === "url") {
        const url = urlInput.value.trim();
        if (!url) {
          urlInput.focus();
          return;
        }
        const resolved = resolveEmbed(url);
        if (!resolved) {
          urlHint.textContent = "Not a valid URL.";
          urlInput.focus();
          return;
        }
        finish({
          kind: "embed",
          url,
          caption: captionInput.value.trim() || undefined,
        });
      } else {
        const html = htmlTextarea.value.trim();
        if (!html) {
          htmlTextarea.focus();
          return;
        }
        finish({ kind: "html", html: htmlTextarea.value });
      }
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish(null);
        return;
      }
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        const target = event.target as HTMLElement | null;
        if (target instanceof HTMLTextAreaElement) return;
        event.preventDefault();
        submit();
      }
    }

    function onBackdropClick(event: globalThis.MouseEvent) {
      if (event.target === dialog) finish(null);
    }

    function onCancel(event: Event) {
      event.preventDefault();
      finish(null);
    }

    let settled = false;
    function finish(value: EmbedDialogResult | null) {
      if (settled) return;
      settled = true;
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("click", onBackdropClick);
      dialog.removeEventListener("keydown", onKeyDown);
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(value);
    }

    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("click", onBackdropClick);
    dialog.addEventListener("keydown", onKeyDown);

    document.body.appendChild(dialog);
    applyMode();
    dialog.showModal();
    panel.focus();
  });
}
