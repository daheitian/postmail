/**
 * Delete Account — multi-step confirmation page
 *
 * Step 1: Download data backup (export)
 * Step 2: Type confirmation phrase
 * Step 3: Delete account
 */

import { useLingui } from "@lingui/react/macro";
import { buildConfirmActionExpression } from "../../../lib/confirm.js";
import { escapeHtml } from "../../../lib/html.js";

export interface DeleteAccountContentProps {
  siteName: string;
  csrfToken: string;
}

export function DeleteAccountContent({
  siteName,
  csrfToken,
}: DeleteAccountContentProps) {
  const { t } = useLingui();

  const confirmPhrase = t({
    message: `I want to delete ${siteName}`,
    comment:
      "@context: Confirmation phrase the user must type to delete their account. {siteName} is the blog name.",
  });
  const escapedConfirmPhrase = escapeHtml(confirmPhrase);
  const deleteAccountLabel = t({
    message: "Delete Account Permanently",
    comment:
      "@context: Final destructive button to delete account and all data",
  });

  return (
    <div
      class="settings-page"
      data-signals={`{
        _deleteStep: 1,
        _confirmText: '',
        _confirmMatch: false,
        _deleteLoading: false,
        _downloadLoading: false,
        _csrfToken: '${csrfToken}'
      }`}
    >
      <h1 class="settings-page-title" style="color: var(--color-destructive)">
        {t({
          message: "Delete Account",
          comment: "@context: Page title for account deletion",
        })}
      </h1>

      <p class="text-sm text-muted-foreground mb-6">
        {t({
          message:
            "This will permanently delete all your data — posts, media, collections, settings, and your account. Your blog will be reset to its initial setup state. This cannot be undone.",
          comment: "@context: Warning text on account deletion page",
        })}
      </p>

      {/* Step 1: Download backup */}
      <div class="delete-account-step">
        <div class="delete-account-step-header">
          <span class="delete-account-step-number">1</span>
          <div>
            <h2 class="delete-account-step-title">
              {t({
                message: "Download your data",
                comment:
                  "@context: Step 1 heading — user must download backup before deleting",
              })}
            </h2>
            <p class="text-sm text-muted-foreground">
              {t({
                message:
                  "Before deleting, download a backup of all your content. You won't be able to recover it after deletion.",
                comment: "@context: Step 1 description for data backup",
              })}
            </p>
          </div>
        </div>

        <div class="delete-account-step-body">
          <button
            type="button"
            class="btn-outline"
            data-attr:disabled="$_downloadLoading"
            data-on:click__prevent={`
              $_downloadLoading = true;
              fetch('/api/export/zola', {method: 'POST', credentials: 'same-origin'})
                .then(function(r) { if (!r.ok) throw new Error(); return r.blob() })
                .then(function(b) {
                  var a = document.createElement('a');
                  a.href = URL.createObjectURL(b);
                  a.download = 'jant-export.zip';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(a.href);
                  if ($_deleteStep < 2) $_deleteStep = 2
                })
                .catch(function() { alert('${t({ message: "Download failed. Please try again.", comment: "@context: Alert when backup download fails during account deletion" }).replace(/'/g, "\\'")}') })
                .finally(function() { $_downloadLoading = false })
            `}
          >
            <span
              data-show="$_downloadLoading"
              class="btn-spinner"
              style="display:none"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="margin-right: 0.5rem"
              data-show="!$_downloadLoading"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            {t({
              message: "Download Backup",
              comment:
                "@context: Button to download site backup before deletion",
            })}
          </button>

          <span
            class="text-sm text-muted-foreground"
            data-show="$_deleteStep >= 2"
            style="display:none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="display: inline-block; vertical-align: middle; margin-right: 0.25rem; color: var(--color-success, oklch(0.55 0.18 155))"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            {t({
              message: "Backup downloaded",
              comment:
                "@context: Confirmation text after downloading backup in delete flow",
            })}
          </span>
        </div>
      </div>

      {/* Step 2: Type confirmation */}
      <div
        class="delete-account-step"
        data-show="$_deleteStep >= 2"
        style="display:none"
      >
        <div class="delete-account-step-header">
          <span class="delete-account-step-number">2</span>
          <div>
            <h2 class="delete-account-step-title">
              {t({
                message: "Confirm deletion",
                comment:
                  "@context: Step 2 heading — user must type confirmation phrase",
              })}
            </h2>
            <p class="text-sm text-muted-foreground">
              {t({
                message: "Type the following phrase to confirm:",
                comment:
                  "@context: Instruction to type confirmation phrase before deletion",
              })}
            </p>
            <p class="delete-account-confirm-phrase">
              <code
                dangerouslySetInnerHTML={{ __html: escapedConfirmPhrase }}
              />
            </p>
          </div>
        </div>

        <div class="delete-account-step-body">
          <input
            type="text"
            class="input"
            data-bind="_confirmText"
            autocomplete="off"
            spellcheck={false}
            data-on:input={`$_confirmMatch = evt.target.value === '${confirmPhrase.replace(/'/g, "\\'")}'`}
            placeholder={confirmPhrase}
          />
        </div>

        <div class="delete-account-step-body" style="margin-top: 0.5rem">
          <button
            type="button"
            class="btn-destructive"
            data-attr:disabled="!$_confirmMatch || $_deleteLoading"
            data-on:click__prevent={buildConfirmActionExpression(
              `$_deleteLoading = true; @post('/settings/account/delete-account', {headers: {'x-csrf-token': $_csrfToken}})`,
              {
                message: t({
                  message:
                    "Delete this blog permanently? This cannot be undone.",
                  comment:
                    "@context: Final browser confirm dialog before account deletion",
                }),
                confirmLabel: deleteAccountLabel,
                cancelLabel: t({
                  message: "Cancel",
                  comment:
                    "@context: Button label to dismiss a dialog or action",
                }),
                tone: "danger",
              },
            )}
          >
            <span
              data-show="$_deleteLoading"
              class="btn-spinner"
              style="display:none"
            />
            {deleteAccountLabel}
          </button>
        </div>
      </div>

      <style>
        {`
          .delete-account-step {
            border: 1px solid var(--color-border);
            border-radius: var(--radius);
            padding: 1.25rem;
            margin-bottom: 1rem;
          }
          .delete-account-step-header {
            display: flex;
            gap: 0.75rem;
            align-items: flex-start;
          }
          .delete-account-step-number {
            flex-shrink: 0;
            width: 1.75rem;
            height: 1.75rem;
            border-radius: 50%;
            background: var(--color-muted);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: 600;
            margin-top: 0.1rem;
          }
          .delete-account-step-title {
            font-size: 0.95rem;
            font-weight: 600;
            margin-bottom: 0.25rem;
          }
          .delete-account-step-body {
            margin-top: 0.75rem;
            padding-left: 2.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          .delete-account-confirm-phrase {
            margin-top: 0.5rem;
          }
          .delete-account-confirm-phrase code {
            padding: 0.25rem 0.5rem;
            background: var(--color-muted);
            border-radius: var(--radius);
            font-size: 0.9rem;
            user-select: all;
          }
        `}
      </style>
    </div>
  );
}
