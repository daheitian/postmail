/**
 * Account settings: profile + password change forms
 */

import { useLingui } from "@lingui/react/macro";
import { SettingsNav } from "./SettingsNav.js";

export function AccountContent({ userName }: { userName: string }) {
  const { t } = useLingui();

  const profileSignals = JSON.stringify({ userName }).replace(/</g, "\\u003c");

  return (
    <>
      <h1 class="text-2xl font-semibold mb-2">
        {t({ message: "Settings", comment: "@context: Dashboard heading" })}
      </h1>
      <SettingsNav currentTab="account" />

      <div class="flex flex-col gap-6 max-w-lg">
        <form
          data-signals={profileSignals}
          data-on:submit__prevent="@post('/dash/settings/account')"
          data-indicator="_profileLoading"
        >
          <div class="card">
            <header>
              <h2>
                {t({
                  message: "Profile",
                  comment: "@context: Account settings section heading",
                })}
              </h2>
            </header>
            <section class="flex flex-col gap-4">
              <div class="field">
                <label class="label">
                  {t({
                    message: "Name",
                    comment: "@context: Account settings form field",
                  })}
                </label>
                <input
                  type="text"
                  data-bind="userName"
                  class="input"
                  required
                />
              </div>
            </section>
          </div>

          <button
            type="submit"
            class="btn mt-4"
            data-attr-disabled="$_profileLoading"
          >
            <span data-show="!$_profileLoading">
              {t({
                message: "Save Profile",
                comment: "@context: Button to save profile",
              })}
            </span>
            <span data-show="$_profileLoading">
              {t({
                message: "Processing...",
                comment:
                  "@context: Loading text shown on submit button while request is in progress",
              })}
            </span>
          </button>
        </form>

        <form
          data-signals="{currentPassword: '', newPassword: '', confirmPassword: ''}"
          data-on:submit__prevent="@post('/dash/settings/password')"
          data-indicator="_passwordLoading"
        >
          <div class="card">
            <header>
              <h2>
                {t({
                  message: "Change Password",
                  comment: "@context: Settings section heading",
                })}
              </h2>
            </header>
            <section class="flex flex-col gap-4">
              <div class="field">
                <label class="label">
                  {t({
                    message: "Current Password",
                    comment: "@context: Password form field",
                  })}
                </label>
                <input
                  type="password"
                  data-bind="currentPassword"
                  class="input"
                  required
                  autocomplete="current-password"
                />
              </div>

              <div class="field">
                <label class="label">
                  {t({
                    message: "New Password",
                    comment: "@context: Password form field",
                  })}
                </label>
                <input
                  type="password"
                  data-bind="newPassword"
                  class="input"
                  required
                  minlength={8}
                  autocomplete="new-password"
                />
              </div>

              <div class="field">
                <label class="label">
                  {t({
                    message: "Confirm New Password",
                    comment: "@context: Password form field",
                  })}
                </label>
                <input
                  type="password"
                  data-bind="confirmPassword"
                  class="input"
                  required
                  minlength={8}
                  autocomplete="new-password"
                />
              </div>
            </section>
          </div>

          <button
            type="submit"
            class="btn mt-4"
            data-attr-disabled="$_passwordLoading"
          >
            <span data-show="!$_passwordLoading">
              {t({
                message: "Change Password",
                comment: "@context: Button to change password",
              })}
            </span>
            <span data-show="$_passwordLoading">
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
