/**
 * Settings Bridge
 *
 * Handles server communication for the Lit settings components.
 * Listens for `jant:settings-save` and `jant:avatar-remove` events,
 * POSTs to the server, and handles the response (toast, DOM updates).
 */

import type {
  SettingsSaveDetail,
  AvatarRemoveDetail,
} from "./components/settings-types.js";
import type { JantSettingsGeneral } from "./components/jant-settings-general.js";
import type { JantSettingsAvatar } from "./components/jant-settings-avatar.js";
import { showToast } from "./toast.js";

// ── Settings save handler ───────────────────────────────────────────

document.addEventListener("jant:settings-save", async (e: Event) => {
  const event = e as CustomEvent<SettingsSaveDetail>;
  const { endpoint, data, section } = event.detail;

  const generalEl = document.querySelector<JantSettingsGeneral>(
    "jant-settings-general",
  );
  const avatarEl = document.querySelector<JantSettingsAvatar>(
    "jant-settings-avatar",
  );

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    if (json.status === "redirect") {
      window.location.href = json.url;
      return;
    }

    if (json.toast) {
      showToast(json.toast);
    }

    // Notify the component that save succeeded
    if (section === "avatar-display") {
      avatarEl?.saved();
    } else {
      generalEl?.sectionSaved(section);
    }
  } catch {
    showToast("Failed to save. Please try again.", "error");

    if (section === "avatar-display") {
      avatarEl?.saveError();
    } else {
      generalEl?.sectionError(section);
    }
  }
});

// ── Avatar remove handler ───────────────────────────────────────────

document.addEventListener("jant:avatar-remove", async (e: Event) => {
  const event = e as CustomEvent<AvatarRemoveDetail>;
  const { endpoint } = event.detail;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    if (json.status === "redirect") {
      window.location.href = json.url;
      return;
    }
  } catch {
    showToast("Failed to remove avatar. Please try again.", "error");
  }
});

// ── Initialize form data from server-rendered JSON ──────────────────

function initSettingsData() {
  const el = document.querySelector<JantSettingsGeneral>(
    "jant-settings-general",
  );
  if (!el) return;

  const dataEl = document.getElementById("settings-initial-data");
  if (!dataEl?.textContent) return;

  try {
    const data = JSON.parse(dataEl.textContent);
    el.initData(data);
  } catch {
    // Data parsing failed, form will use defaults
  }
}

// Run after Lit components have upgraded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSettingsData);
} else {
  // Use microtask to let custom elements upgrade first
  queueMicrotask(initSettingsData);
}
