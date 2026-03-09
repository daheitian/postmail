/**
 * Settings root page — iOS-style grouped list linking to sub-pages
 */

import { useLingui } from "@lingui/react/macro";

/** Chevron right icon shared by all rows */
function ChevronRight() {
  return (
    <svg
      class="settings-item-chevron"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function SettingsItem({
  href,
  icon,
  color,
  name,
  description,
}: {
  href: string;
  icon: string;
  color: string;
  name: string;
  description: string;
}) {
  return (
    <a href={href} class="settings-item">
      <span class="settings-item-icon" style={`background-color:${color}`}>
        <span dangerouslySetInnerHTML={{ __html: icon }} />
      </span>
      <span class="settings-item-text">
        <span class="settings-item-name">{name}</span>
        <span class="settings-item-desc">{description}</span>
      </span>
      <ChevronRight />
    </a>
  );
}

// Lucide icon SVG paths (16x16, stroke-based)
const ICONS = {
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  image: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  menu: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`,
  palette: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  type: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>`,
  code: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  arrowRightLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  key: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`,
};

// oklch-based colors for icon backgrounds
const COLORS = {
  blue: "oklch(0.55 0.2 250)",
  purple: "oklch(0.55 0.2 300)",
  green: "oklch(0.55 0.18 155)",
  orange: "oklch(0.6 0.18 55)",
  pink: "oklch(0.6 0.2 350)",
  indigo: "oklch(0.5 0.2 275)",
  amber: "oklch(0.6 0.16 75)",
  teal: "oklch(0.55 0.15 185)",
  gray: "oklch(0.55 0.01 250)",
};

export function SettingsRootContent() {
  const { t } = useLingui();

  return (
    <div class="settings-root">
      {/* Site */}
      <div>
        <div class="settings-group-label">
          {t({
            message: "Site",
            comment: "@context: Settings group label for site settings",
          })}
        </div>
        <div class="settings-group">
          <SettingsItem
            href="/settings/general"
            icon={ICONS.settings}
            color={COLORS.blue}
            name={t({
              message: "General",
              comment: "@context: Settings item — general settings",
            })}
            description={t({
              message: "Name, description, language",
              comment: "@context: Settings item description for general",
            })}
          />
        </div>
      </div>

      {/* Design */}
      <div>
        <div class="settings-group-label">
          {t({
            message: "Design",
            comment: "@context: Settings group label for design settings",
          })}
        </div>
        <div class="settings-group">
          <SettingsItem
            href="/settings/avatar"
            icon={ICONS.image}
            color={COLORS.purple}
            name={t({
              message: "Avatar",
              comment: "@context: Settings item — avatar settings",
            })}
            description={t({
              message: "Favicon and header icon",
              comment: "@context: Settings item description for avatar",
            })}
          />
          <SettingsItem
            href="/settings/navigation"
            icon={ICONS.menu}
            color={COLORS.green}
            name={t({
              message: "Navigation",
              comment: "@context: Settings item — navigation settings",
            })}
            description={t({
              message: "Header links, featured",
              comment: "@context: Settings item description for navigation",
            })}
          />
          <SettingsItem
            href="/settings/color-theme"
            icon={ICONS.palette}
            color={COLORS.orange}
            name={t({
              message: "Color Theme",
              comment: "@context: Settings item — color theme settings",
            })}
            description={t({
              message: "Color theme",
              comment: "@context: Settings item description for color theme",
            })}
          />
          <SettingsItem
            href="/settings/font-theme"
            icon={ICONS.type}
            color={COLORS.pink}
            name={t({
              message: "Font Theme",
              comment: "@context: Settings item — font theme settings",
            })}
            description={t({
              message: "Typography",
              comment: "@context: Settings item description for font theme",
            })}
          />
          <SettingsItem
            href="/settings/custom-css"
            icon={ICONS.code}
            color={COLORS.indigo}
            name={t({
              message: "Custom CSS",
              comment: "@context: Settings item — custom CSS settings",
            })}
            description={t({
              message: "Custom styling",
              comment: "@context: Settings item description for custom CSS",
            })}
          />
        </div>
      </div>

      {/* Advanced */}
      <div>
        <div class="settings-group-label">
          {t({
            message: "Advanced",
            comment: "@context: Settings group label for advanced settings",
          })}
        </div>
        <div class="settings-group">
          <SettingsItem
            href="/settings/custom-urls"
            icon={ICONS.arrowRightLeft}
            color={COLORS.amber}
            name={t({
              message: "Custom URLs",
              comment: "@context: Settings item — custom URL settings",
            })}
            description={t({
              message: "Redirects and custom paths",
              comment: "@context: Settings item description for custom URLs",
            })}
          />
          <SettingsItem
            href="/settings/api-tokens"
            icon={ICONS.key}
            color={COLORS.teal}
            name={t({
              message: "API Tokens",
              comment: "@context: Settings item — API token settings",
            })}
            description={t({
              message: "Bearer tokens for scripts and automation",
              comment: "@context: Settings item description for API tokens",
            })}
          />
        </div>
      </div>

      {/* Account */}
      <div>
        <div class="settings-group-label">
          {t({
            message: "Account",
            comment: "@context: Settings group label for account settings",
          })}
        </div>
        <div class="settings-group">
          <SettingsItem
            href="/settings/account"
            icon={ICONS.shield}
            color={COLORS.gray}
            name={t({
              message: "Account",
              comment: "@context: Settings item — account settings",
            })}
            description={t({
              message: "Sessions, password",
              comment: "@context: Settings item description for account",
            })}
          />
        </div>
      </div>

      {/* Sign Out */}
      <div class="pt-2 text-center">
        <button
          type="button"
          data-on:click__prevent="@post('/signout')"
          class="text-sm text-destructive hover:text-destructive/80 transition-colors"
        >
          {t({
            message: "Sign Out",
            comment: "@context: Settings link — sign out action",
          })}
        </button>
      </div>
    </div>
  );
}
