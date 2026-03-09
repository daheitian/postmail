import { randomBytes, createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { parseArgs } from "node:util";

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      remote: { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log("Usage: jant reset-password [--remote]");
    console.log("");
    console.log("Generate a password reset token (expires in 15 minutes).");
    console.log("");
    console.log("Options:");
    console.log("  --remote  Run against remote D1 database (default: local)");
    process.exit(0);
  }

  const flag = values.remote ? "--remote" : "--local";

  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const expiry = Math.floor(Date.now() / 1000) + 15 * 60;
  const value = `${hash}:${expiry}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const sql = `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('PASSWORD_RESET_TOKEN', '${value}', ${timestamp})`;

  execSync(`npx wrangler d1 execute DB ${flag} --command "${sql}"`, {
    stdio: "inherit",
  });

  console.log("");
  console.log("Password reset token generated (expires in 15 minutes).");
  console.log(`Visit: /reset?token=${token}`);
}
