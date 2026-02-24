/**
 * Appearance sub-navigation tabs
 */

import { useLingui } from "@lingui/react/macro";

export type AppearanceTab = "color" | "fonts" | "advanced";

export function AppearanceNav({ currentTab }: { currentTab: AppearanceTab }) {
  const { t } = useLingui();

  const tabs: { id: AppearanceTab; label: string; href: string }[] = [
    {
      id: "color",
      label: t({
        message: "Color Theme",
        comment: "@context: Appearance sub-navigation tab",
      }),
      href: "/dash/appearance",
    },
    {
      id: "fonts",
      label: t({
        message: "Font Theme",
        comment: "@context: Appearance sub-navigation tab",
      }),
      href: "/dash/appearance/fonts",
    },
    {
      id: "advanced",
      label: t({
        message: "Advanced",
        comment: "@context: Appearance sub-navigation tab",
      }),
      href: "/dash/appearance/advanced",
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
