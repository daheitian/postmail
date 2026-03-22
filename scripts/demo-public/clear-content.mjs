import { loadDemoWorkflowEnv } from "../demo-shared/env.mjs";
import { DEMO_PUBLIC_DIR, readDemoPublicConfig } from "./lib/runtime.mjs";
import {
  buildSiteContentResetSql,
  executeRemoteD1,
  resolveSingleRemoteSite,
} from "../lib/remote-site-ops.mjs";

loadDemoWorkflowEnv({ sites: ["demo"] });

const siteUrl = process.env.DEMO_PUBLIC_URL || readDemoPublicConfig("SITE_URL");
const site = resolveSingleRemoteSite({
  cwd: DEMO_PUBLIC_DIR,
  label: "demo-public",
});

executeRemoteD1({
  cwd: DEMO_PUBLIC_DIR,
  sql: buildSiteContentResetSql(site.id),
});

console.log(`Cleared content for ${siteUrl} (${site.key}).`);
