/**
 * General settings form
 */

import { useLingui } from "@lingui/react/macro";
import { SettingsNav } from "./SettingsNav.js";

export function GeneralContent({
  siteName,
  siteDescription,
  siteLanguage,
  homeDefaultView,
  siteNameFallback,
  siteDescriptionFallback,
}: {
  siteName: string;
  siteDescription: string;
  siteLanguage: string;
  homeDefaultView: string;
  siteNameFallback: string;
  siteDescriptionFallback: string;
}) {
  const { t } = useLingui();

  const generalSignals = JSON.stringify({
    siteName,
    siteDescription,
    siteLanguage,
    homeDefaultView,
  }).replace(/</g, "\\u003c");

  return (
    <>
      <h1 class="text-2xl font-semibold mb-2">
        {t({ message: "Settings", comment: "@context: Dashboard heading" })}
      </h1>
      <SettingsNav currentTab="general" />

      <div class="flex flex-col gap-6 max-w-lg">
        <form
          data-signals={generalSignals}
          data-on:submit__prevent="@post('/dash/settings')"
          data-indicator="_loading"
        >
          <div class="card">
            <header>
              <h2>
                {t({
                  message: "General",
                  comment: "@context: Settings section heading",
                })}
              </h2>
            </header>
            <section class="flex flex-col gap-4">
              <div class="field">
                <label class="label">
                  {t({
                    message: "Site Name",
                    comment: "@context: Settings form field",
                  })}
                </label>
                <input
                  type="text"
                  data-bind="siteName"
                  class="input"
                  placeholder={siteNameFallback}
                />
              </div>

              <div class="field">
                <label class="label">
                  {t({
                    message: "Site Description",
                    comment: "@context: Settings form field",
                  })}
                </label>
                <textarea
                  data-bind="siteDescription"
                  class="textarea"
                  rows={3}
                  placeholder={siteDescriptionFallback}
                >
                  {siteDescription}
                </textarea>
              </div>

              <div class="field">
                <label class="label">
                  {t({
                    message: "Language",
                    comment: "@context: Settings form field",
                  })}
                </label>
                <select data-bind="siteLanguage" class="select">
                  <option value="en" selected={siteLanguage === "en"}>
                    English
                  </option>
                  <option value="zh-Hans" selected={siteLanguage === "zh-Hans"}>
                    简体中文
                  </option>
                  <option value="zh-Hant" selected={siteLanguage === "zh-Hant"}>
                    繁體中文
                  </option>
                </select>
              </div>

              <div class="field">
                <label class="label">
                  {t({
                    message: "Default Homepage View",
                    comment: "@context: Settings form field",
                  })}
                </label>
                <select data-bind="homeDefaultView" class="select">
                  <option
                    value="latest"
                    selected={homeDefaultView === "latest"}
                  >
                    {t({
                      message: "Latest",
                      comment:
                        "@context: Homepage view option - show latest posts",
                    })}
                  </option>
                  <option
                    value="featured"
                    selected={homeDefaultView === "featured"}
                  >
                    {t({
                      message: "Featured",
                      comment:
                        "@context: Homepage view option - show featured posts",
                    })}
                  </option>
                </select>
              </div>
            </section>
          </div>

          <button type="submit" class="btn mt-4" data-attr-disabled="$_loading">
            <span data-show="!$_loading">
              {t({
                message: "Save Settings",
                comment: "@context: Button to save settings",
              })}
            </span>
            <span data-show="$_loading">
              {t({
                message: "Processing...",
                comment:
                  "@context: Loading text shown on submit button while request is in progress",
              })}
            </span>
          </button>
        </form>
      </div>
    </>
  );
}
