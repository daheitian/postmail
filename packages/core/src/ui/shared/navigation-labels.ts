import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { I18n } from "../../i18n/i18n.js";
import { isFullUrl, stripSitePathPrefix } from "../../lib/url.js";
import type { NavItemType, SystemNavKey } from "../../types.js";

type Translator = Pick<I18n, "_">;

type NavigationLabelItem = {
  type: NavItemType;
  systemKey?: SystemNavKey;
  label: string;
  url: string;
};

const BUILTIN_NAV_LABELS = {
  collections: msg({
    message: "Collections",
    comment: "@context: Built-in navigation label for the collections page",
  }),
  archive: msg({
    message: "Archive",
    comment: "@context: Built-in navigation label for the archive page",
  }),
  settings: msg({
    message: "Settings",
    comment: "@context: Built-in navigation label for settings",
  }),
  signIn: msg({
    message: "Sign in",
    comment: "@context: Built-in navigation label shown when auth is required",
  }),
} as const;

const SYSTEM_NAV_TITLES: Partial<Record<SystemNavKey, MessageDescriptor>> = {
  collections: BUILTIN_NAV_LABELS.collections,
  archive: BUILTIN_NAV_LABELS.archive,
  settings: BUILTIN_NAV_LABELS.settings,
};

const SYSTEM_NAV_DESCRIPTIONS: Record<SystemNavKey, MessageDescriptor> = {
  rss: msg({
    message:
      "Add a link to your main RSS feed. Change what /feed returns in General.",
    comment: "@context: Description for the RSS system navigation toggle",
  }),
  settings: msg({
    message: "Shows 'Settings' when logged in, 'Sign in' when logged out",
    comment: "@context: Description for the settings system navigation toggle",
  }),
  collections: msg({
    message: "Link to your collections page",
    comment:
      "@context: Description for the collections system navigation toggle",
  }),
  archive: msg({
    message: "Link to the post archive",
    comment: "@context: Description for the archive system navigation toggle",
  }),
};

function getInternalNavPath(url: string, sitePathPrefix = ""): string | null {
  if (
    isFullUrl(url) ||
    url.startsWith("//") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("#")
  ) {
    return null;
  }

  try {
    const pathname = new URL(url, "https://jant.invalid").pathname;
    return stripSitePathPrefix(pathname, sitePathPrefix) ?? pathname;
  } catch {
    return null;
  }
}

function getBuiltinNavLabelDescriptor(
  item: NavigationLabelItem,
  sitePathPrefix = "",
): MessageDescriptor | null {
  if (item.type !== "system" || !item.systemKey) return null;

  if (item.systemKey === "collections") {
    return BUILTIN_NAV_LABELS.collections;
  }

  if (item.systemKey === "archive") {
    return BUILTIN_NAV_LABELS.archive;
  }

  if (item.systemKey === "settings") {
    const path = getInternalNavPath(item.url, sitePathPrefix);
    return path === "/signin"
      ? BUILTIN_NAV_LABELS.signIn
      : BUILTIN_NAV_LABELS.settings;
  }

  return null;
}

export function getNavItemDisplayLabel(
  item: NavigationLabelItem,
  i18n: Translator,
  sitePathPrefix = "",
): string {
  const descriptor = getBuiltinNavLabelDescriptor(item, sitePathPrefix);
  return descriptor ? i18n._(descriptor) : item.label;
}

export function getSystemNavDisplayLabel(
  key: SystemNavKey,
  i18n: Translator,
): string {
  const descriptor = SYSTEM_NAV_TITLES[key];
  return descriptor ? i18n._(descriptor) : "RSS";
}

export function getSystemNavDescription(
  key: SystemNavKey,
  i18n: Translator,
): string {
  return i18n._(SYSTEM_NAV_DESCRIPTIONS[key]);
}
