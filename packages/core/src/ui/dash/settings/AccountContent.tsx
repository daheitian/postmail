/**
 * Password settings: change sign-in password
 */

import { useLingui } from "@lingui/react/macro";

export function AccountContent() {
  const { t } = useLingui();

  return (
    <div class="flex flex-col max-w-lg">
      <form
        data-signals="{currentPassword: '', newPassword: '', confirmPassword: ''}"
        data-on:submit__prevent="@post('/settings/password')"
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
  );
}
