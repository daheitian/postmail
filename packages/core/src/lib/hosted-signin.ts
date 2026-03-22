import {
  getHostedControlPlaneBaseUrl,
  getHostedControlPlaneProviderLabel as getConfiguredHostedControlPlaneProviderLabel,
  getSiteResolutionMode,
} from "./env.js";

function getHostedAdminContinuationPath(publicRequestUrl: string): string {
  const currentHost = new URL(publicRequestUrl).host;
  return `/auth/handoff/start?host=${encodeURIComponent(currentHost)}&redirect=${encodeURIComponent("/settings")}`;
}

function buildHostedControlPlaneUrl(
  env: object | undefined | null,
  pathname: string,
  search?: string,
): string | null {
  const hostedControlPlaneBaseUrl = getHostedControlPlaneBaseUrl(env);
  if (
    !hostedControlPlaneBaseUrl ||
    getSiteResolutionMode(env) !== "host-based"
  ) {
    return null;
  }

  const location = new URL(hostedControlPlaneBaseUrl);
  location.pathname = pathname;
  location.search = search ?? "";
  return location.toString();
}

export function getHostedControlPlaneSigninUrl(
  env: object | undefined | null,
  publicRequestUrl: string,
): string | null {
  return buildHostedControlPlaneUrl(
    env,
    "/auth/handoff/start",
    getHostedAdminContinuationPath(publicRequestUrl).replace(
      /^\/auth\/handoff\/start/,
      "",
    ),
  );
}

export function getHostedControlPlaneResetUrl(
  env: object | undefined | null,
  publicRequestUrl: string,
): string | null {
  const search = new URLSearchParams();
  search.set("next", getHostedAdminContinuationPath(publicRequestUrl));
  return buildHostedControlPlaneUrl(env, "/reset", `?${search.toString()}`);
}

export function getHostedControlPlaneDashboardUrl(
  env: object | undefined | null,
): string | null {
  return buildHostedControlPlaneUrl(env, "/sites");
}

export function getHostedControlPlaneAccountUrl(
  env: object | undefined | null,
): string | null {
  return buildHostedControlPlaneUrl(env, "/settings/account");
}

export function getHostedControlPlaneAccountPasswordUrl(
  env: object | undefined | null,
): string | null {
  return buildHostedControlPlaneUrl(env, "/settings/account/password");
}

export function getHostedControlPlaneProviderLabel(
  env: object | undefined | null,
): string | null {
  return getConfiguredHostedControlPlaneProviderLabel(env) ?? null;
}

export function isHostedControlPlaneEnabled(
  env: object | undefined | null,
): boolean {
  return (
    getSiteResolutionMode(env) === "host-based" &&
    Boolean(getHostedControlPlaneBaseUrl(env))
  );
}
