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
