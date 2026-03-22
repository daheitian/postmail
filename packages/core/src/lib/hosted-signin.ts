import { getJantCloudBaseUrl, getSiteResolutionMode } from "./env.js";

export function getHostedCloudSigninUrl(
  env: object | undefined | null,
  publicRequestUrl: string,
): string | null {
  const cloudBaseUrl = getJantCloudBaseUrl(env);
  if (!cloudBaseUrl || getSiteResolutionMode(env) !== "host-based") {
    return null;
  }

  const location = new URL(cloudBaseUrl);
  const currentHost = new URL(publicRequestUrl).host;
  location.pathname = "/auth/handoff/start";
  location.searchParams.set("host", currentHost);
  location.searchParams.set("redirect", "/settings");
  return location.toString();
}
