import { randomBytes, createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { executeD1 } from "../lib/d1-query.js";
import { openNodeSqlite } from "../lib/node-sqlite.js";
import {
  getCliRuntimeLabel,
  resolveCliRuntime,
} from "../lib/runtime-target.js";

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      local: { type: "boolean", default: false },
      remote: { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log("Usage: jant reset-password [--local | --remote]");
    console.log("");
    console.log("Generate a password reset token (expires in 15 minutes).");
    console.log("");
    console.log("Options:");
    console.log("  --local   Force local D1 instead of DATABASE_URL");
    console.log("  --remote  Run against remote D1 database (default: local)");
    console.log("");
    console.log(
      "If DATABASE_URL or DATA_DIR is set and no runtime flag is passed, this command uses Node SQLite.",
    );
    process.exit(0);
  }

  const runtime = resolveCliRuntime(values);

  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const expiry = Math.floor(Date.now() / 1000) + 15 * 60;
  const value = `${hash}:${expiry}`;
  const timestamp = Math.floor(Date.now() / 1000);

  if (runtime === "node") {
    const { sqlite } = openNodeSqlite(process.env);
    try {
      sqlite
        .prepare(
          `
            INSERT INTO "setting" ("key", "value", "updated_at")
            VALUES (?, ?, ?)
            ON CONFLICT ("key") DO UPDATE
            SET "value" = excluded."value",
                "updated_at" = excluded."updated_at"
          `,
        )
        .run("PASSWORD_RESET_TOKEN", value, timestamp);
    } finally {
      sqlite.close();
    }
  } else {
    const sql = `
      INSERT INTO "setting" ("key", "value", "updated_at")
      VALUES ('PASSWORD_RESET_TOKEN', '${value}', ${timestamp})
      ON CONFLICT ("key") DO UPDATE
      SET "value" = excluded."value",
          "updated_at" = excluded."updated_at"
    `;

    executeD1(sql, runtime);
  }

  console.log("");
  console.log("Password reset token generated (expires in 15 minutes).");
  console.log(`Runtime: ${getCliRuntimeLabel(runtime)}`);
  console.log(`Visit: /reset?token=${token}`);
}
