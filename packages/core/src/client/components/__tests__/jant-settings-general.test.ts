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

function requireElement<T>(element: T | null | undefined, message: string): T {
  if (!element) {
    throw new Error(message);
  }
  return element;
}

function findSelectByLabel(
  el: HTMLElement,
  labelText: string,
): globalThis.HTMLSelectElement | null {
  for (const field of Array.from(el.querySelectorAll<HTMLElement>(".field"))) {
    const label = field.querySelector(".label");
    if (!label?.textContent?.includes(labelText)) continue;
    return field.querySelector("select") as globalThis.HTMLSelectElement | null;
  }

  return null;
}

function findRadioByValue(
  el: HTMLElement,
  name: string,
  value: string,
): HTMLInputElement | null {
  return el.querySelector<HTMLInputElement>(
    `input[type="radio"][name="${name}"][value="${value}"]`,
  );
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
  site: "Site",
  languageAndTime: "Language & Time",
  home: "Home",
  search: "Search",
  siteName: "Site Name",
  aboutBlog: "About this blog",
  aboutBlogHelp: "Displayed above your blog posts.",
  language: "Language",
  timeZone: "Time Zone",
  feeds: "Feeds",
  mainRssFeed: "Main RSS feed",
  mainRssFeedHelp: "This controls what /feed returns.",
  mainRssFeedWarning: "Changing this updates what subscribers get from /feed.",
  availableFeedUrls: "Fixed feed URLs",
  availableFeedUrlsHelp:
    "Use these when you want a feed URL that never changes.",
  mainFeedUrl: "Main feed",
  latestFeedUrl: "Latest feed",
  featuredFeedUrl: "Featured feed",
  latestFeedOption: "Latest",
  latestFeedOptionDescription: "Uses the latest public posts for /feed.",
  featuredFeedOption: "Featured",
  featuredFeedOptionDescription: "Uses featured posts for /feed.",
  siteFooter: "Site Footer",
  footerHelp: "Displayed at the bottom of posts.",
  showJantBrandingOnHome:
    'Show "Build with Jant" at the bottom of the home page',
  markdownSupported: "Markdown supported",
  allowIndexing: "Allow search engines to index my site",
  demoSeoLocked: "Demo sites always stay hidden from search engines.",
  save: "Save",
  cancel: "Cancel",
};

const timezones: SettingsTimezone[] = [
  { value: "UTC", label: "(UTC) UTC" },
  { value: "America/New_York", label: "(UTC-05:00) Eastern Time" },
];

const languages: SettingsLanguage[] = [
  { value: "en", label: "English" },
  { value: "zh-Hans", label: "简体中文" },
];

const initialData = {
  siteName: "My Blog",
  siteDescription: "A test blog",
  siteLanguage: "en",
  timeZone: "UTC",
  mainRssFeed: "featured",
  siteFooter: "Footer text",
  showJantBrandingOnHome: false,
  noindex: false,
};

function findCheckboxByLabel(
  el: HTMLElement,
  labelText: string,
): HTMLInputElement | undefined {
  return Array.from(
    el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ).find((checkbox) =>
    checkbox.closest("label")?.textContent?.includes(labelText),
  );
}

async function createElement(
  opts: {
    demoMode?: boolean;
  } = {},
): Promise<JantSettingsGeneral> {
  const el = document.createElement(
    "jant-settings-general",
  ) as JantSettingsGeneral;
  el.labels = labels;
  el.timezones = timezones;
  el.languages = languages;
  el.siteNameFallback = "Fallback Name";
  el.siteDescriptionFallback = "Fallback Description";
  el.mainFeedUrl = "/feed";
  el.latestFeedUrl = "/feed/latest";
  el.featuredFeedUrl = "/feed/featured";
  el.demoMode = opts.demoMode ?? false;
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

  it("renders general settings heading and search controls", async () => {
    const el = await createElement();
    const headings = el.querySelectorAll("h2");
    const headingTexts = Array.from(headings).map((h) => h.textContent);
    expect(headingTexts).toContain("General");
    expect(headingTexts).toContain("Search");
    expect(el.textContent).toContain(labels.site);
    expect(el.textContent).toContain(labels.home);
    expect(el.textContent).toContain(labels.allowIndexing);
    expect(el.textContent).toContain(labels.showJantBrandingOnHome);
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
    const tzSelect = requireElement(
      findSelectByLabel(el, labels.timeZone),
      "expected time zone select",
    );
    const options = tzSelect?.querySelectorAll("option");
    expect(options?.length).toBe(2);
    expect(options?.[0]?.value).toBe("UTC");
  });

  it("renders language options", async () => {
    const el = await createElement();
    const langSelect = requireElement(
      findSelectByLabel(el, labels.language),
      "expected language select",
    );
    const options = langSelect?.querySelectorAll("option");
    expect(options?.length).toBe(2);
    expect(options?.[0]?.value).toBe("en");
    expect(options?.[1]?.value).toBe("zh-Hans");
  });

  it("renders main RSS feed controls and fixed feed URLs", async () => {
    const el = await createElement();
    const featuredRadio = requireElement(
      findRadioByValue(el, "main-rss-feed", "featured"),
      "expected featured radio option",
    );

    expect(featuredRadio.checked).toBe(true);
    expect(el.textContent).toContain(labels.mainRssFeedHelp);
    expect(el.textContent).toContain(labels.mainRssFeedWarning);
    expect(el.textContent).toContain(labels.featuredFeedOptionDescription);
    expect(el.textContent).toContain(labels.latestFeedOptionDescription);
    expect(el.textContent).toContain("/feed/latest");
    expect(el.textContent).toContain("/feed/featured");
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
    expect(d.endpoint).toBe("/settings/general");
    expect(d.section).toBe("general");
    expect(d.data.siteName).toBe("New Name");
    expect(d.data.mainRssFeed).toBe("featured");
  });

  it("includes mainRssFeed in general section save", async () => {
    const el = await createElement();
    const latestRadio = requireElement(
      findRadioByValue(el, "main-rss-feed", "latest"),
      "expected latest radio option",
    );

    latestRadio.click();
    await el.updateComplete;

    let detail: SettingsSaveDetail | null = null;
    el.addEventListener("jant:settings-save", (event) => {
      detail = (event as CustomEvent<SettingsSaveDetail>).detail;
    });

    const saveBtn = el.querySelector<HTMLButtonElement>(".btn");
    saveBtn?.click();
    await el.updateComplete;

    expect(detail).not.toBeNull();
    expect((detail as unknown as SettingsSaveDetail).data.mainRssFeed).toBe(
      "latest",
    );
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
    const searchCheckbox = findCheckboxByLabel(el, labels.allowIndexing);
    expect(searchCheckbox?.checked).toBe(true);

    // Toggle
    searchCheckbox?.click();
    await el.updateComplete;

    // Should now be unchecked
    expect(searchCheckbox?.checked).toBe(false);
  });

  it("includes footer in general section save", async () => {
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

    // Click save in the general card (footer is now part of general form)
    const saveBtn = el.querySelector<HTMLButtonElement>(".btn");
    saveBtn?.click();
    await el.updateComplete;

    expect(detail).not.toBeNull();
    const d = detail as unknown as SettingsSaveDetail;
    expect(d.endpoint).toBe("/settings/general");
    expect(d.section).toBe("general");
    expect(d.data.siteFooter).toBe("New footer");
  });

  it("includes home page Jant branding preference in general section save", async () => {
    const el = await createElement();
    const brandingCheckbox = requireElement(
      findCheckboxByLabel(el, labels.showJantBrandingOnHome) ?? null,
      "expected home page branding checkbox",
    );

    brandingCheckbox.click();
    await el.updateComplete;

    let detail: SettingsSaveDetail | null = null;
    el.addEventListener("jant:settings-save", (event) => {
      const customEvent = event as CustomEvent<SettingsSaveDetail>;
      detail = customEvent.detail;
    });

    const saveBtn = el.querySelector<HTMLButtonElement>(".btn");
    saveBtn?.click();
    await el.updateComplete;

    expect(detail).not.toBeNull();
    const d = detail as unknown as SettingsSaveDetail;
    expect(d.endpoint).toBe("/settings/general");
    expect(d.section).toBe("general");
    expect(d.data.showJantBrandingOnHome).toBe(true);
  });

  it("dispatches jant:settings-save for search section", async () => {
    const el = await createElement();
    const searchCheckbox = findCheckboxByLabel(el, labels.allowIndexing);

    // Toggle to make dirty
    searchCheckbox?.click();
    await el.updateComplete;

    let detail: SettingsSaveDetail | null = null;
    el.addEventListener("jant:settings-save", (event) => {
      const customEvent = event as CustomEvent<SettingsSaveDetail>;
      detail = customEvent.detail;
    });

    // Find Search Save button (section after the <hr> divider)
    const hr = el.querySelector("hr");
    const searchSection = hr?.nextElementSibling;
    const searchSaveBtn =
      searchSection?.querySelector<HTMLButtonElement>(".btn");
    searchSaveBtn?.click();
    await el.updateComplete;

    expect(detail).not.toBeNull();
    const d = detail as unknown as SettingsSaveDetail;
    expect(d.endpoint).toBe("/settings/general/search");
    expect(d.section).toBe("search");
  });

  it("disables search indexing toggle in demo mode", async () => {
    const el = await createElement({ demoMode: true });
    const searchCheckbox = requireElement(
      findCheckboxByLabel(el, labels.allowIndexing) ?? null,
      "expected search checkbox",
    );

    expect(searchCheckbox.disabled).toBe(true);
    expect(el.textContent).toContain(labels.demoSeoLocked);

    searchCheckbox.click();
    await el.updateComplete;

    expect(searchCheckbox.checked).toBe(true);
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
