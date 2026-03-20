import {
  DEFAULT_SITE_LANGUAGE,
  DEFAULT_SITE_NAME,
  ensureManagedSetup,
} from "../../../packages/core/dev/scripts/dev-auth-db.mjs";

const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@jant.me";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "jantdemodemojant";

const ensured = await ensureManagedSetup({
  flag: "--remote",
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
  siteName: DEFAULT_SITE_NAME,
  siteLanguage: DEFAULT_SITE_LANGUAGE,
  missingAdminMessage: [
    "No credential user found in the demo database.",
    "Run `mise run db-demo-bootstrap` to create the managed demo shell.",
  ].join("\n"),
});

console.log("");
console.log("Demo shell is ready.");
console.log(`  Email:     ${DEMO_EMAIL}`);
console.log(`  Password:  ${DEMO_PASSWORD}`);
if (ensured.createdCredentialUser) {
  console.log("  Account:   created demo credential user");
}
if (ensured.promotedToAdmin) {
  console.log("  Role:      normalized to admin");
}
if (ensured.completedOnboarding) {
  console.log("  Setup:     marked onboarding complete");
}
if (ensured.seededNavigation) {
  console.log("  Nav:       ensured default navigation");
}
