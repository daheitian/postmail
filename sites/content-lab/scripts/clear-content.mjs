import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSiteContentResetSql,
  executeRemoteD1,
  resolveSingleRemoteSite,
} from "../../../scripts/lib/remote-site-ops.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(__dirname, "..");

const site = resolveSingleRemoteSite({
  cwd: siteDir,
  label: "content-lab",
});

executeRemoteD1({
  cwd: siteDir,
  sql: buildSiteContentResetSql(site.id, {
    clearNavItems: true,
    clearApiTokens: true,
  }),
});

console.log(`Cleared content for content-lab (${site.key}).`);
