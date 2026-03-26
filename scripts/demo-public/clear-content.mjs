import { loadDemoWorkflowEnv } from "../demo-shared/env.mjs";
import { DEMO_PUBLIC_DIR, resolveDemoPublicSiteUrl } from "./lib/runtime.mjs";
import {
  buildSiteContentResetSql,
  executeRemoteD1,
  resolveSingleRemoteSite,
} from "../lib/remote-site-ops.mjs";

loadDemoWorkflowEnv({ sites: ["demo"] });

const siteUrl = resolveDemoPublicSiteUrl();
const site = resolveSingleRemoteSite({
  cwd: DEMO_PUBLIC_DIR,
  label: "demo-public",
});

executeRemoteD1({
  cwd: DEMO_PUBLIC_DIR,
  sql: buildSiteContentResetSql(site.id),
});

console.log(`Cleared content for ${siteUrl} (${site.key}).`);
