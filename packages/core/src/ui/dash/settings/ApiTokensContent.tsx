/**
 * API Tokens Settings Page
 *
 * Manage Bearer tokens for programmatic API access.
 * Tokens are shown only once at creation — after that, only the prefix is visible.
 */

import { useLingui } from "@lingui/react/macro";
import type { ApiToken } from "../../../types/entities.js";
import { formatDate } from "../../../lib/time.js";

const API_DOCS_URL = "https://github.com/jant-me/jant/blob/main/docs/API.md";

function TokenRow({ token }: { token: ApiToken }) {
  const { t } = useLingui();

  return (
    <div class="py-4 flex items-start gap-4 border-b border-border last:border-b-0">
      <div class="flex-1 min-w-0">
        <div class="font-medium">{token.name}</div>
        <div class="text-sm text-muted-foreground mt-0.5">
          <code class="text-xs bg-muted px-1.5 py-0.5 rounded">
            jnt_{token.prefix}...
          </code>
          <span class="mx-2">&middot;</span>
          {t({
            message: `Created ${formatDate(token.createdAt)}`,
            comment: "@context: Token creation date",
          })}
          {token.lastUsedAt && (
            <>
              <span class="mx-2">&middot;</span>
              {t({
                message: `Last used ${formatDate(token.lastUsedAt)}`,
                comment: "@context: Token last used date",
              })}
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        class="btn-sm-ghost text-destructive"
        data-on:click__prevent={`confirm('${t({ message: "Revoke this token? Any scripts using it will stop working.", comment: "@context: Confirm dialog for revoking API token" })}') && @post('/settings/api-tokens/${token.id}/delete')`}
      >
        {t({
          message: "Revoke",
          comment: "@context: Button to revoke API token",
        })}
      </button>
    </div>
  );
}

export function ApiTokensContent({
  tokens,
  siteUrl,
}: {
  tokens: ApiToken[];
  siteUrl: string;
}) {
  const { t } = useLingui();

  return (
    <div
      class="flex flex-col gap-8 max-w-2xl"
      data-signals="{tokenName: '', _tokenLoading: false, _newPlaintext: ''}"
    >
      {/* New token alert — shown after creation via signal patch */}
      <div data-show="$_newPlaintext" style="display:none">
        <div class="alert" role="alert">
          <strong>
            {t({
              message: "Copy your token now — it won't be shown again.",
              comment: "@context: Warning to copy newly created API token",
            })}
          </strong>
          <section>
            <code
              class="bg-muted px-3 py-2 rounded break-all select-all"
              data-text="$_newPlaintext"
            >
              {" "}
            </code>
          </section>
        </div>
      </div>

      {/* Generate token form */}
      <div>
        <h2 class="text-lg font-medium mb-4">
          {t({
            message: "API Tokens",
            comment: "@context: Settings section heading",
          })}
        </h2>
        <p class="text-sm text-muted-foreground mb-4">
          {t({
            message:
              "Tokens let you access the API from scripts, shortcuts, and other tools without signing in.",
            comment: "@context: API tokens description",
          })}
        </p>
        <form
          data-on:submit__prevent="@post('/settings/api-tokens')"
          data-indicator="_tokenLoading"
          class="flex gap-2 items-end"
        >
          <div class="field flex-1">
            <label class="label" for="tokenName">
              {t({
                message: "Token name",
                comment: "@context: API token name field label",
              })}
            </label>
            <input
              type="text"
              id="tokenName"
              data-bind="tokenName"
              class="input"
              placeholder={t({
                message: "e.g. iOS Shortcuts",
                comment: "@context: Placeholder for API token name input",
              })}
              required
            />
          </div>
          <button
            type="submit"
            class="btn"
            data-attr:disabled="$_tokenLoading || !$tokenName.trim()"
          >
            {t({
              message: "Generate Token",
              comment: "@context: Button to create new API token",
            })}
          </button>
        </form>
      </div>

      {/* Token list */}
      {tokens.length > 0 && (
        <div>
          <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {t({
              message: "Active Tokens",
              comment: "@context: Heading for list of active API tokens",
            })}
          </h3>
          <div class="border border-border rounded-lg px-4">
            {tokens.map((token) => (
              <TokenRow key={token.id} token={token} />
            ))}
          </div>
        </div>
      )}

      {/* Usage examples */}
      <div>
        <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
          {t({
            message: "Usage",
            comment: "@context: Heading for API token usage examples",
          })}
        </h3>
        <div class="flex flex-col gap-3 text-sm">
          <div>
            <div class="text-muted-foreground mb-1">
              {t({
                message: "Create a post with curl:",
                comment: "@context: Label for curl example",
              })}
            </div>
            <pre class="bg-muted px-3 py-2 rounded text-xs overflow-x-auto">
              <code>
                {`curl -X POST ${siteUrl}/api/posts \\
  -H "Authorization: Bearer jnt_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"format":"note","body":"Hello from the API"}'`}
              </code>
            </pre>
          </div>
          <div>
            <div class="text-muted-foreground mb-1">
              {t({
                message: "List posts:",
                comment: "@context: Label for list posts curl example",
              })}
            </div>
            <pre class="bg-muted px-3 py-2 rounded text-xs overflow-x-auto">
              <code>
                {`curl ${siteUrl}/api/posts \\
  -H "Authorization: Bearer jnt_YOUR_TOKEN"`}
              </code>
            </pre>
          </div>
          <p class="text-muted-foreground">
            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              class="underline hover:text-foreground transition-colors"
            >
              {t({
                message: "API reference",
                comment: "@context: Link to API documentation",
              })}
            </a>
            {" — "}
            {t({
              message: "all available endpoints and request formats.",
              comment: "@context: Description after API reference link",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
