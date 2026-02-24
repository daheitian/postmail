/**
 * Settings sub-navigation tabs
 */

import { useLingui } from "@lingui/react/macro";

export type SettingsTab = "general" | "redirects" | "account";

export function SettingsNav({ currentTab }: { currentTab: SettingsTab }) {
  const { t } = useLingui();

  const tabs: { id: SettingsTab; label: string; href: string }[] = [
    {
      id: "general",
      label: t({
        message: "General",
        comment: "@context: Settings sub-navigation tab",
      }),
      href: "/dash/settings",
    },
    {
      id: "redirects",
      label: t({
        message: "Redirects",
        comment: "@context: Settings sub-navigation tab",
      }),
      href: "/dash/settings/redirects",
    },
    {
      id: "account",
      label: t({
        message: "Account",
        comment: "@context: Settings sub-navigation tab",
      }),
      href: "/dash/settings/account",
    },
  ];

  return (
    <nav class="dash-subnav">
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={tab.href}
          class={tab.id === currentTab ? "active" : ""}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
