/**
 * Settings sub-navigation tabs
 */

import { useLingui } from "@lingui/react/macro";

export type SettingsTab = "general" | "appearance" | "account";

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
      id: "appearance",
      label: t({
        message: "Appearance",
        comment: "@context: Settings sub-navigation tab",
      }),
      href: "/dash/settings/appearance",
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
    <nav class="flex gap-1 mb-6">
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={tab.href}
          class={`px-3 py-2 text-sm rounded-md ${
            tab.id === currentTab
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
