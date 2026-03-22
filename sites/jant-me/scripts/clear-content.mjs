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
  label: "jant.me",
});

executeRemoteD1({
  cwd: siteDir,
  sql: buildSiteContentResetSql(site.id),
});

console.log(`Cleared content for jant.me (${site.key}).`);
