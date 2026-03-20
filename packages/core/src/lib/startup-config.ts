import type { Bindings } from "../types.js";
import { getAuthSecret } from "./env.js";

const AUTH_SECRET_ERROR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Configuration Error</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafafa;color:#111}div{max-width:480px;text-align:center}h1{font-size:1.25rem;font-weight:600}p{color:#666;line-height:1.6}code{background:#eee;padding:2px 6px;border-radius:4px;font-size:.9em}</style>
</head>
<body>
<div>
<h1>AUTH_SECRET is not set</h1>
<p>Set <code>AUTH_SECRET</code> in your environment or <code>wrangler.toml</code> to start Jant.</p>
</div>
</body>
</html>`;

/**
 * Returns the startup configuration error page for invalid required env vars.
 *
 * @param env - Worker bindings available at startup
 * @returns HTML for a blocking startup configuration error, or `null` when config is valid
 *
 * @example
 * ```ts
 * getStartupConfigurationErrorPage({ AUTH_SECRET: "secret" }) // null
 * ```
 */
export function getStartupConfigurationErrorPage(
  env: Pick<Bindings, "AUTH_SECRET" | "DEV_API_TOKEN">,
): string | null {
  if (!getAuthSecret(env)) {
    return AUTH_SECRET_ERROR_HTML;
  }

  return null;
}
