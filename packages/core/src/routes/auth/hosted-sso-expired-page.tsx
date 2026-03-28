import type { Context } from "hono";
import type { FC } from "hono/jsx";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { getI18n } from "../../i18n/index.js";
import { buildPageTitle } from "../../lib/page-title.js";
import { BaseLayout } from "../../ui/layouts/BaseLayout.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const HostedSsoExpiredContent: FC<{
  providerLabel: string;
  providerUrl: string;
}> = ({ providerLabel, providerUrl }) => {
  const { t } = useLingui();

  return (
    <div class="min-h-screen flex items-center justify-center">
      <div class="card max-w-md w-full">
        <header>
          <h2>
            {t({
              message: "This Link Has Expired",
              comment: "@context: Hosted SSO expired link page heading",
            })}
          </h2>
        </header>
        <section>
          <p class="text-muted-foreground">
            {t({
              message: "This sign-in link has expired. Return to ",
              comment:
                "@context: Hosted SSO expired link message segment shown before the hosted control-plane link",
            })}
            <a
              class="text-foreground underline underline-offset-4 hover:no-underline"
              href={providerUrl}
            >
              {providerLabel}
            </a>
            {t({
              message: " and try again.",
              comment:
                "@context: Hosted SSO expired link message segment shown after the hosted control-plane link",
            })}
          </p>
        </section>
      </div>
    </div>
  );
};

export function renderHostedSsoExpiredPage(
  c: Context<Env>,
  input: {
    providerLabel: string;
    providerUrl: string;
  },
) {
  const i18n = getI18n(c);

  return (
    <BaseLayout
      title={buildPageTitle(
        i18n._(
          msg({
            message: "This Link Has Expired",
            comment: "@context: Hosted SSO expired link page title",
          }),
        ),
        c.var.appConfig.siteName,
      )}
      c={c}
    >
      <HostedSsoExpiredContent
        providerLabel={input.providerLabel}
        providerUrl={input.providerUrl}
      />
    </BaseLayout>
  );
}
