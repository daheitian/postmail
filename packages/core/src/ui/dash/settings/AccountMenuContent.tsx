/**
 * Account settings sub-menu — lists Sessions and Password options
 */

import { useLingui } from "@lingui/react/macro";

/** Chevron right icon */
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

function AccountMenuItem({
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

const ICONS = {
  monitor: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
};

const COLORS = {
  teal: "oklch(0.55 0.15 185)",
  gray: "oklch(0.55 0.01 250)",
  green: "oklch(0.55 0.18 155)",
};

export function AccountMenuContent() {
  const { t } = useLingui();

  return (
    <div class="settings-root">
      <div>
        <div class="settings-group">
          <AccountMenuItem
            href="/settings/account/sessions"
            icon={ICONS.monitor}
            color={COLORS.teal}
            name={t({
              message: "Sessions",
              comment: "@context: Settings item — session management",
            })}
            description={t({
              message: "Manage active sign-in sessions",
              comment: "@context: Settings item description for sessions",
            })}
          />
          <AccountMenuItem
            href="/settings/account/password"
            icon={ICONS.lock}
            color={COLORS.gray}
            name={t({
              message: "Password",
              comment: "@context: Settings item — password settings",
            })}
            description={t({
              message: "Change your sign-in password",
              comment:
                "@context: Settings item description for password change",
            })}
          />
        </div>
      </div>

      {/* Data */}
      <div>
        <div class="settings-group-label">
          {t({
            message: "Data",
            comment: "@context: Settings group label for data export/import",
          })}
        </div>
        <div class="settings-group">
          <form
            method="post"
            action="/api/export/zola"
            class="settings-export-form"
          >
            <button type="submit" class="settings-item">
              <span
                class="settings-item-icon"
                style={`background-color:${COLORS.green}`}
              >
                <span dangerouslySetInnerHTML={{ __html: ICONS.download }} />
              </span>
              <span class="settings-item-text">
                <span class="settings-item-name">
                  {t({
                    message: "Export Site",
                    comment:
                      "@context: Settings item — export site as Zola ZIP",
                  })}
                </span>
                <span class="settings-item-desc">
                  {t({
                    message: "Download as a Zola static site (.zip)",
                    comment:
                      "@context: Settings item description for site export",
                  })}
                </span>
              </span>
              <ChevronRight />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
