import { useLingui } from "@lingui/react/macro";
import { toPublicPath } from "../../lib/url.js";
import type { ThemeMode } from "../../types/config.js";
import type { ColorTheme } from "../color-themes.js";

function buildBrandHref(mode: ThemeMode, sitePathPrefix = ""): string {
  const params = new URLSearchParams({ mode });
  return toPublicPath(`/_/brand?${params.toString()}`, sitePathPrefix);
}

function ModePill({
  href,
  isActive,
  label,
}: {
  href: string;
  isActive: boolean;
  label: string;
}) {
  return (
    <a href={href} class={isActive ? "btn" : "btn-outline"}>
      {label}
    </a>
  );
}

function ColorSpecCard({
  title,
  role,
  value,
  surface,
}: {
  title: string;
  role: string;
  value: string;
  surface: string;
}) {
  return (
    <article class="brand-spec-card">
      <div
        class="brand-spec-card-swatch"
        style={`background:${surface}`}
        aria-hidden="true"
      />
      <div class="brand-spec-card-copy">
        <p class="brand-spec-card-role">{role}</p>
        <h3 class="brand-spec-card-title">{title}</h3>
        <code class="brand-spec-card-value">{value}</code>
      </div>
    </article>
  );
}

export function BrandPage({
  theme,
  currentMode,
  sitePathPrefix = "",
}: {
  theme: ColorTheme;
  currentMode: ThemeMode;
  sitePathPrefix?: string;
}) {
  const { t } = useLingui();
  const light = theme.light;
  const dark = theme.dark;

  const coreBrand = light["--primary"] ?? "";
  const supportBrand = light["--site-accent"] ?? "";
  const paper = light["--background"] ?? "";
  const ink = light["--foreground"] ?? "";
  const success = light["--success"] ?? "";
  const modes: ThemeMode[] = ["auto", "light", "dark"];

  return (
    <div class="brand-page py-8" data-page="brand">
      <section class="brand-hero">
        <div class="brand-hero-copy">
          <p class="brand-eyebrow">
            {t({
              message: "Jant brand",
              comment: "@context: Eyebrow on the public brand page",
            })}
          </p>
          <h1 class="brand-title">
            {t({
              message:
                "A calm writing brand built around absinthe green and warm linen.",
              comment: "@context: Hero title on the public brand page",
            })}
          </h1>
          <p class="brand-lead">
            {t({
              message:
                "Jant should feel unhurried, private, and confident without becoming polished product theater. The palette is meant to read like paper, ink, and a quiet mark left in the margin.",
              comment: "@context: Intro paragraph on the public brand page",
            })}
          </p>

          <div
            class="brand-keywords"
            aria-label={t({
              message: "Brand attributes",
              comment: "@context: Accessible label for the brand keyword list",
            })}
          >
            {[
              t({
                message: "Quiet",
                comment: "@context: Brand keyword on the public brand page",
              }),
              t({
                message: "Humble",
                comment: "@context: Brand keyword on the public brand page",
              }),
              t({
                message: "Unhurried",
                comment: "@context: Brand keyword on the public brand page",
              }),
              t({
                message: "Personal",
                comment: "@context: Brand keyword on the public brand page",
              }),
            ].map((keyword) => (
              <span key={keyword} class="brand-keyword">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <aside class="brand-manifest">
          <div class="brand-manifest-header">
            <h2>
              {t({
                message: "Core palette",
                comment: "@context: Heading for the core palette card",
              })}
            </h2>
            <div class="flex flex-wrap gap-2">
              {modes.map((mode) => (
                <ModePill
                  key={mode}
                  href={buildBrandHref(mode, sitePathPrefix)}
                  isActive={currentMode === mode}
                  label={
                    mode === "auto"
                      ? t({
                          message: "Auto",
                          comment:
                            "@context: Theme mode option on the brand page",
                        })
                      : mode === "light"
                        ? t({
                            message: "Light",
                            comment:
                              "@context: Theme mode option on the brand page",
                          })
                        : t({
                            message: "Dark",
                            comment:
                              "@context: Theme mode option on the brand page",
                          })
                  }
                />
              ))}
            </div>
          </div>

          <div class="brand-manifest-swatches">
            <ColorSpecCard
              title={t({
                message: "Absinthe Green",
                comment: "@context: Name of the primary brand swatch",
              })}
              role={t({
                message: "Brand core",
                comment: "@context: Label for the primary brand swatch",
              })}
              value={coreBrand}
              surface={coreBrand}
            />
            <ColorSpecCard
              title={t({
                message: "Warm Linen",
                comment: "@context: Name of the paper swatch",
              })}
              role={t({
                message: "Base surface",
                comment: "@context: Label for the paper swatch",
              })}
              value={paper}
              surface={paper}
            />
            <ColorSpecCard
              title={t({
                message: "Soft Charcoal",
                comment: "@context: Name of the text swatch",
              })}
              role={t({
                message: "Reading ink",
                comment: "@context: Label for the text swatch",
              })}
              value={ink}
              surface={ink}
            />
            <ColorSpecCard
              title={t({
                message: "Absinthe Accent",
                comment: "@context: Name of the secondary accent swatch",
              })}
              role={t({
                message: "Content accent",
                comment: "@context: Label for the secondary accent swatch",
              })}
              value={supportBrand}
              surface={supportBrand}
            />
            <ColorSpecCard
              title={t({
                message: "Leaf Green",
                comment: "@context: Name of the success swatch",
              })}
              role={t({
                message: "Status color",
                comment: "@context: Label for the success swatch",
              })}
              value={success}
              surface={success}
            />
          </div>
        </aside>
      </section>

      <section class="brand-grid">
        <article class="brand-panel">
          <p class="brand-panel-kicker">
            {t({
              message: "Brand logic",
              comment: "@context: Section kicker on the public brand page",
            })}
          </p>
          <h2 class="brand-panel-title">
            {t({
              message: "One color family, three jobs.",
              comment: "@context: Section title on the public brand page",
            })}
          </h2>
          <div class="brand-panel-body">
            <p>
              {t({
                message:
                  "Absinthe Green is the brand center. Warm Linen keeps the space soft. Soft Charcoal carries most of the weight so the interface never needs to shout.",
                comment: "@context: Body copy on the public brand page",
              })}
            </p>
            <p>
              {t({
                message:
                  "Primary is used for committed actions. Site accent is used for content links and thread cues. Success is intentionally cleaner so state feedback does not blur into the brand voice.",
                comment: "@context: Body copy on the public brand page",
              })}
            </p>
          </div>
        </article>

        <article class="brand-panel">
          <p class="brand-panel-kicker">
            {t({
              message: "Voice",
              comment: "@context: Section kicker on the public brand page",
            })}
          </p>
          <h2 class="brand-panel-title">
            {t({
              message: "How Jant should feel in one glance.",
              comment: "@context: Section title on the public brand page",
            })}
          </h2>
          <ul class="brand-principles">
            <li>
              <strong>
                {t({
                  message: "Private, not precious.",
                  comment: "@context: Brand principle on the public brand page",
                })}
              </strong>{" "}
              {t({
                message:
                  "The palette should feel personal and lived-in, not premium for the sake of premium.",
                comment:
                  "@context: Brand principle explanation on the public brand page",
              })}
            </li>
            <li>
              <strong>
                {t({
                  message: "Calm, not sleepy.",
                  comment: "@context: Brand principle on the public brand page",
                })}
              </strong>{" "}
              {t({
                message:
                  "Muted colors can still carry rhythm and hierarchy when typography does the heavy lifting.",
                comment:
                  "@context: Brand principle explanation on the public brand page",
              })}
            </li>
            <li>
              <strong>
                {t({
                  message: "Humble, not anonymous.",
                  comment: "@context: Brand principle on the public brand page",
                })}
              </strong>{" "}
              {t({
                message:
                  "The green note gives Jant a recognizable identity without turning the brand into a loud signature.",
                comment:
                  "@context: Brand principle explanation on the public brand page",
              })}
            </li>
          </ul>
        </article>
      </section>

      <section class="brand-showcase">
        <div class="brand-showcase-copy">
          <p class="brand-panel-kicker">
            {t({
              message: "In use",
              comment: "@context: Section kicker on the public brand page",
            })}
          </p>
          <h2 class="brand-panel-title">
            {t({
              message: "The brand should read like a page first.",
              comment: "@context: Section title on the public brand page",
            })}
          </h2>
          <p class="brand-panel-body">
            {t({
              message:
                "The brand is working when the writing still leads, but the interface quietly holds the page together. Links should feel editorial. Buttons should feel steady. Metadata should stay out of the way.",
              comment: "@context: Body copy on the public brand page",
            })}
          </p>
        </div>

        <div class="brand-live-sheet">
          <div class="brand-live-meta">
            <span>
              {t({
                message: "March 2026",
                comment: "@context: Meta label on the public brand page",
              })}
            </span>
            <span aria-hidden="true">&middot;</span>
            <span>
              {t({
                message: "Brand note",
                comment: "@context: Meta label on the public brand page",
              })}
            </span>
          </div>

          <h3 class="brand-live-title">
            {t({
              message:
                "Absinthe Green should feel like a mark in the margin, not a spotlight.",
              comment: "@context: Showcase title on the public brand page",
            })}
          </h3>

          <p class="brand-live-body">
            {t({
              message: "This is the test: a content link like",
              comment:
                "@context: Showcase paragraph prefix on the public brand page",
            })}{" "}
            <a
              href={toPublicPath("/_/brand", sitePathPrefix)}
              class="content-link"
            >
              {t({
                message: "read the full brand note",
                comment:
                  "@context: Showcase content link on the public brand page",
              })}
            </a>{" "}
            {t({
              message:
                "should feel present, but it should never start acting like a product CTA inside the paragraph.",
              comment:
                "@context: Showcase paragraph suffix on the public brand page",
            })}
          </p>

          <blockquote class="brand-live-quote">
            {t({
              message:
                "A quiet brand still leaves a signature. It simply does it without urgency.",
              comment: "@context: Showcase quote on the public brand page",
            })}
          </blockquote>

          <div class="brand-live-actions">
            <button type="button" class="btn-primary">
              {t({
                message: "Use Absinthe Green",
                comment:
                  "@context: Showcase primary button on the public brand page",
              })}
            </button>
            <button type="button" class="btn-outline">
              {t({
                message: "View token values",
                comment:
                  "@context: Showcase secondary button on the public brand page",
              })}
            </button>
          </div>
        </div>
      </section>

      <section class="brand-rules-grid">
        <article class="brand-rule-card brand-rule-card-do">
          <p class="brand-panel-kicker">
            {t({
              message: "Use it for",
              comment: "@context: Section kicker on the public brand page",
            })}
          </p>
          <ul class="brand-rule-list">
            <li>
              {t({
                message: "Primary actions that need confidence, not flash.",
                comment:
                  "@context: Positive brand usage guidance on the public brand page",
              })}
            </li>
            <li>
              {t({
                message: "Content links, thread markers, and quiet emphasis.",
                comment:
                  "@context: Positive brand usage guidance on the public brand page",
              })}
            </li>
            <li>
              {t({
                message:
                  "Editorial surfaces where the page should feel soft and composed.",
                comment:
                  "@context: Positive brand usage guidance on the public brand page",
              })}
            </li>
          </ul>
        </article>

        <article class="brand-rule-card brand-rule-card-avoid">
          <p class="brand-panel-kicker">
            {t({
              message: "Avoid",
              comment: "@context: Section kicker on the public brand page",
            })}
          </p>
          <ul class="brand-rule-list">
            <li>
              {t({
                message: "Pairing it with bright SaaS blues or neon greens.",
                comment:
                  "@context: Negative brand usage guidance on the public brand page",
              })}
            </li>
            <li>
              {t({
                message:
                  "Using brand green for every state, including success and warnings.",
                comment:
                  "@context: Negative brand usage guidance on the public brand page",
              })}
            </li>
            <li>
              {t({
                message:
                  "Over-polishing the layout until the writing stops feeling personal.",
                comment:
                  "@context: Negative brand usage guidance on the public brand page",
              })}
            </li>
          </ul>
        </article>
      </section>

      <section class="brand-dark-panel">
        <div class="brand-dark-copy">
          <p class="brand-panel-kicker">
            {t({
              message: "Dark mode",
              comment: "@context: Section kicker on the public brand page",
            })}
          </p>
          <h2 class="brand-panel-title">
            {t({
              message:
                "In dark mode, keep the same calm. Only lift the contrast.",
              comment: "@context: Section title on the public brand page",
            })}
          </h2>
          <p class="brand-panel-body">
            {t({
              message:
                "Dark Jant should still feel like paper and ink translated into evening light. The brand green becomes softer and milkier, but it should not turn electric.",
              comment: "@context: Body copy on the public brand page",
            })}
          </p>
        </div>

        <div class="brand-dark-swatches">
          <ColorSpecCard
            title={t({
              message: "Dark primary",
              comment:
                "@context: Label for dark primary swatch on the public brand page",
            })}
            role={t({
              message: "Button tone",
              comment: "@context: Role label for dark primary swatch",
            })}
            value={dark["--primary"] ?? ""}
            surface={dark["--primary"] ?? ""}
          />
          <ColorSpecCard
            title={t({
              message: "Dark accent",
              comment:
                "@context: Label for dark accent swatch on the public brand page",
            })}
            role={t({
              message: "Link tone",
              comment: "@context: Role label for dark accent swatch",
            })}
            value={dark["--site-accent"] ?? ""}
            surface={dark["--site-accent"] ?? ""}
          />
          <ColorSpecCard
            title={t({
              message: "Dark paper",
              comment:
                "@context: Label for dark background swatch on the public brand page",
            })}
            role={t({
              message: "Base surface",
              comment: "@context: Role label for dark background swatch",
            })}
            value={dark["--background"] ?? ""}
            surface={dark["--background"] ?? ""}
          />
        </div>
      </section>
    </div>
  );
}
