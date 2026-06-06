import type { Child } from "hono/jsx";

export type SettingsDirectoryTone = "default" | "subtle" | "danger";

function ChevronRight() {
  return (
    <svg
      class="settings-directory-item-chevron"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ExternalLinkIndicator() {
  return (
    <svg
      class="settings-directory-item-chevron"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

export function SettingsDirectorySection({
  title,
  tone = "default",
  children,
}: {
  title: string;
  tone?: "default" | "danger";
  children: Child;
}) {
  return (
    <section class="settings-directory-section">
      <h2 class="settings-directory-section-title" data-tone={tone}>
        {title}
      </h2>
      <div class="settings-directory-list">{children}</div>
    </section>
  );
}

export function SettingsDirectoryItemContent({
  icon,
  name,
  description,
  external = false,
}: {
  icon: string;
  name: string;
  description: string;
  external?: boolean;
}) {
  return (
    <>
      <span class="settings-directory-item-icon">
        <span dangerouslySetInnerHTML={{ __html: icon }} />
      </span>
      <span class="settings-directory-item-copy">
        <span class="settings-directory-item-name">{name}</span>
        <span class="settings-directory-item-desc">{description}</span>
      </span>
      {external ? <ExternalLinkIndicator /> : <ChevronRight />}
    </>
  );
}

export function SettingsDirectoryLink({
  href,
  icon,
  tone = "default",
  name,
  description,
  target,
  rel,
}: {
  href: string;
  icon: string;
  tone?: SettingsDirectoryTone;
  name: string;
  description: string;
  target?: "_blank" | "_self";
  rel?: string;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      class="settings-directory-item"
      data-tone={tone}
    >
      <SettingsDirectoryItemContent
        icon={icon}
        name={name}
        description={description}
        external={target === "_blank"}
      />
    </a>
  );
}
