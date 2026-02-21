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

      <div class="flex flex-col max-w-lg">
        <form
          data-signals={profileSignals}
          data-on:submit__prevent="@post('/dash/settings/account')"
          data-indicator="_profileLoading"
        >
          <h2 class="text-lg font-semibold mb-4">
            {t({
              message: "Profile",
              comment: "@context: Account settings section heading",
            })}
          </h2>
          <div class="flex flex-col gap-4">
            <div class="field">
              <label class="label">
                {t({
                  message: "Name",
                  comment: "@context: Account settings form field",
                })}
              </label>
              <input type="text" data-bind="userName" class="input" required />
            </div>
          </div>

          <button
            type="submit"
            class="btn mt-4"
            data-attr:disabled="$_profileLoading"
          >
            <svg
              data-show="$_profileLoading"
              style="display:none"
              class="animate-spin size-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              role="status"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {t({
              message: "Save Profile",
              comment: "@context: Button to save profile",
            })}
          </button>
        </form>

        <hr class="my-8" />

        <form
          data-signals="{currentPassword: '', newPassword: '', confirmPassword: ''}"
          data-on:submit__prevent="@post('/dash/settings/password')"
          data-indicator="_passwordLoading"
        >
          <h2 class="text-lg font-semibold mb-4">
            {t({
              message: "Change Password",
              comment: "@context: Settings section heading",
            })}
          </h2>
          <div class="flex flex-col gap-4">
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
          </div>

          <button
            type="submit"
            class="btn mt-4"
            data-attr:disabled="$_passwordLoading"
          >
            <svg
              data-show="$_passwordLoading"
              style="display:none"
              class="animate-spin size-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              role="status"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {t({
              message: "Change Password",
              comment: "@context: Button to change password",
            })}
          </button>
        </form>
      </div>
    </>
  );
}
