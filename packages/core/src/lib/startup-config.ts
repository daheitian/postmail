import type { Bindings } from "../types.js";
import { getAuthSecret } from "./env.js";

const AUTH_SECRET_ERROR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Configuration Error</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafafa;color:#111;padding:24px}div{max-width:560px;text-align:left;background:#fff;border:1px solid #e5e5e5;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.04)}h1{font-size:1.25rem;font-weight:600;margin:0 0 12px}p{color:#4a4a4a;line-height:1.6;margin:12px 0}code{background:#f1f1f1;padding:2px 6px;border-radius:4px;font-size:.9em}a{color:#0f766e;text-decoration:none}a:hover{text-decoration:underline}</style>
</head>
<body>
<div>
<h1>AUTH_SECRET is not set</h1>
<p>Jant needs a 32+ character auth secret to sign sessions.</p>
<p><strong>Local development:</strong> add <code>AUTH_SECRET=...</code> to <code>.dev.vars</code>.</p>
<p><strong>Cloudflare Workers:</strong> add <code>AUTH_SECRET</code> as a Worker secret in the dashboard under Variables and Secrets, or run <code>wrangler secret put AUTH_SECRET</code>.</p>
<p><a href="https://github.com/jant-me/jant/blob/main/docs/deployment.md#configure-secrets" target="_blank" rel="noopener noreferrer">Open deployment instructions</a></p>
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
