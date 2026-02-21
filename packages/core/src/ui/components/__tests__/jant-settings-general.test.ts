// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from "vitest";
import type {
  SettingsLabels,
  SettingsTimezone,
  SettingsLanguage,
  SettingsSaveDetail,
} from "../settings-types.js";
import "../jant-settings-general.js";
import type { JantSettingsGeneral } from "../jant-settings-general.js";

function requireElement<T extends globalThis.Element>(
  element: T | null,
  message: string,
): T {
  if (!element) {
    throw new Error(message);
  }
  return element;
}

const labels: SettingsLabels = {
  blogAvatar: "Blog Avatar",
  uploadAvatar: "Upload Avatar",
  remove: "Remove",
  avatarHelp: "For best results, upload a square image.",
  displayInHeader: "Display avatar in my site header",
  processing: "Processing...",
  uploading: "Uploading...",
  uploadError: "Upload failed.",
  general: "General",
  siteName: "Site Name",
  aboutBlog: "About this blog",
  aboutBlogHelp: "Displayed above your blog posts.",
  language: "Language",
  defaultHomepageView: "Default Homepage View",
  latest: "Latest",
  featured: "Featured",
  timeZone: "Time Zone",
  siteFooter: "Site Footer",
  footerPlaceholder: "Markdown supported",
  footerHelp: "Displayed at the bottom of posts.",
  seo: "SEO",
  allowIndexing: "It's OK for search engines to index my site",
  save: "Save",
  cancel: "Cancel",
};

const timezones: SettingsTimezone[] = [
  { value: "UTC", label: "(UTC) UTC" },
  { value: "Eastern Time (US & Canada)", label: "(UTC-05:00) Eastern Time" },
];

const languages: SettingsLanguage[] = [
  { value: "en", label: "English" },
  { value: "zh-Hans", label: "简体中文" },
];

const initialData = {
  siteName: "My Blog",
  siteDescription: "A test blog",
  siteLanguage: "en",
  homeDefaultView: "latest",
  timeZone: "UTC",
  siteFooter: "Footer text",
  noindex: false,
};

async function createElement(): Promise<JantSettingsGeneral> {
  const el = document.createElement(
    "jant-settings-general",
  ) as JantSettingsGeneral;
  el.labels = labels;
  el.timezones = timezones;
  el.languages = languages;
  el.siteNameFallback = "Fallback Name";
  el.siteDescriptionFallback = "Fallback Description";
  document.body.appendChild(el);
  await el.updateComplete;
  el.initData(initialData);
  await el.updateComplete;
  return el;
}

describe("JantSettingsGeneral", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders general, footer, and SEO sections", async () => {
    const el = await createElement();
    const headings = el.querySelectorAll("h2");
    const headingTexts = Array.from(headings).map((h) => h.textContent);
    expect(headingTexts).toContain("General");
    expect(headingTexts).toContain("Site Footer");
    expect(headingTexts).toContain("SEO");
  });

  it("renders form fields with initial values", async () => {
    const el = await createElement();
    const siteNameInput = requireElement(
      el.querySelector<HTMLInputElement>('input[type="text"]'),
      "expected site name input",
    );
    expect(siteNameInput.value).toBe("My Blog");

    const textareas = el.querySelectorAll("textarea");
    expect(textareas[0]?.value).toBe("A test blog");
    expect(textareas[1]?.value).toBe("Footer text");
  });

  it("renders timezone options", async () => {
    const el = await createElement();
    const selects = el.querySelectorAll("select");
    // Third select is timezone (language, homepage view, timezone)
    const tzSelect = selects[2];
    const options = tzSelect?.querySelectorAll("option");
    expect(options?.length).toBe(2);
    expect(options?.[0]?.value).toBe("UTC");
  });

  it("renders language options", async () => {
    const el = await createElement();
    const selects = el.querySelectorAll("select");
    const langSelect = selects[0];
    const options = langSelect?.querySelectorAll("option");
    expect(options?.length).toBe(2);
    expect(options?.[0]?.value).toBe("en");
    expect(options?.[1]?.value).toBe("zh-Hans");
  });

  it("tracks general form dirty state on input", async () => {
    const el = await createElement();
    const siteNameInput = requireElement(
      el.querySelector<HTMLInputElement>('input[type="text"]'),
      "expected site name input",
    );

    // Simulate input
    siteNameInput.value = "New Name";
    siteNameInput.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    // Save button should be enabled
    const saveBtn = el.querySelector<HTMLButtonElement>(".btn");
    expect(saveBtn?.disabled).toBe(false);
  });

  it("cancel reverts general form to original values", async () => {
    const el = await createElement();
    const siteNameInput = requireElement(
      el.querySelector<HTMLInputElement>('input[type="text"]'),
      "expected site name input",
    );

    // Change the value
    siteNameInput.value = "Changed";
    siteNameInput.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    // Click cancel (second button after Save)
    const cancelBtn = el.querySelector<HTMLButtonElement>(".btn-outline");
    cancelBtn?.click();
    await el.updateComplete;

    // Value should be reverted
    expect(siteNameInput?.value).toBe("My Blog");
  });

  it("dispatches jant:settings-save for general section", async () => {
    const el = await createElement();
    const siteNameInput = requireElement(
      el.querySelector<HTMLInputElement>('input[type="text"]'),
      "expected site name input",
    );

    // Make dirty
    siteNameInput.value = "New Name";
    siteNameInput.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    let detail: SettingsSaveDetail | null = null;
    el.addEventListener("jant:settings-save", (event) => {
      const customEvent = event as CustomEvent<SettingsSaveDetail>;
      detail = customEvent.detail;
    });

    // Click save
    const saveBtn = el.querySelector<HTMLButtonElement>(".btn");
    saveBtn?.click();
    await el.updateComplete;

    expect(detail).not.toBeNull();
    const d = detail as unknown as SettingsSaveDetail;
    expect(d.endpoint).toBe("/dash/settings");
    expect(d.section).toBe("general");
    expect(d.data.siteName).toBe("New Name");
  });

  it("sectionSaved resets dirty state and updates originals", async () => {
    const el = await createElement();
    const siteNameInput = requireElement(
      el.querySelector<HTMLInputElement>('input[type="text"]'),
      "expected site name input",
    );

    // Make dirty and save
    siteNameInput.value = "Saved Name";
    siteNameInput.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    // Simulate bridge calling sectionSaved
    el.sectionSaved("general");
    await el.updateComplete;

    // Save button should be disabled again
    const saveBtn = el.querySelector<HTMLButtonElement>(".btn");
    expect(saveBtn?.disabled).toBe(true);
  });

  it("SEO checkbox toggles noindex state", async () => {
    const el = await createElement();
    // noindex is false initially, so checkbox should be checked (allow indexing)
    const checkboxes = el.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    const seoCheckbox = checkboxes[0]; // Only checkbox in this component
    expect(seoCheckbox?.checked).toBe(true);

    // Toggle
    seoCheckbox?.click();
    await el.updateComplete;

    // Should now be unchecked
    expect(seoCheckbox?.checked).toBe(false);
  });

  it("dispatches jant:settings-save for footer section", async () => {
    const el = await createElement();
    const textareas = el.querySelectorAll("textarea");
    const footerTextarea = textareas[1]; // Second textarea is footer

    // Make dirty
    const footer = requireElement(footerTextarea, "expected footer textarea");
    footer.value = "New footer";
    footer.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    let detail: SettingsSaveDetail | null = null;
    el.addEventListener("jant:settings-save", (event) => {
      const customEvent = event as CustomEvent<SettingsSaveDetail>;
      detail = customEvent.detail;
    });

    // Find the footer Save button (second card's button)
    const cards = el.querySelectorAll(".card");
    const footerSaveBtn = cards[1]?.querySelector<HTMLButtonElement>(".btn");
    footerSaveBtn?.click();
    await el.updateComplete;

    expect(detail).not.toBeNull();
    const d = detail as unknown as SettingsSaveDetail;
    expect(d.endpoint).toBe("/dash/settings/footer");
    expect(d.section).toBe("footer");
    expect(d.data.siteFooter).toBe("New footer");
  });

  it("dispatches jant:settings-save for SEO section", async () => {
    const el = await createElement();
    const checkboxes = el.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    const seoCheckbox = checkboxes[0];

    // Toggle to make dirty
    seoCheckbox?.click();
    await el.updateComplete;

    let detail: SettingsSaveDetail | null = null;
    el.addEventListener("jant:settings-save", (event) => {
      const customEvent = event as CustomEvent<SettingsSaveDetail>;
      detail = customEvent.detail;
    });

    // Find SEO Save button (third card)
    const cards = el.querySelectorAll(".card");
    const seoSaveBtn = cards[2]?.querySelector<HTMLButtonElement>(".btn");
    seoSaveBtn?.click();
    await el.updateComplete;

    expect(detail).not.toBeNull();
    const d = detail as unknown as SettingsSaveDetail;
    expect(d.endpoint).toBe("/dash/settings/seo");
    expect(d.section).toBe("seo");
  });

  it("shows loading spinner during save", async () => {
    const el = await createElement();
    const siteNameInput = requireElement(
      el.querySelector<HTMLInputElement>('input[type="text"]'),
      "expected site name input",
    );

    // Make dirty and save
    siteNameInput.value = "Loading test";
    siteNameInput.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;

    const saveBtn = el.querySelector<HTMLButtonElement>(".btn");
    saveBtn?.click();
    await el.updateComplete;

    // Save button should be disabled during loading
    expect(saveBtn?.disabled).toBe(true);
    // Spinner should be visible
    const spinner = saveBtn?.querySelector("svg.animate-spin");
    expect(spinner).not.toBeNull();
  });
});
