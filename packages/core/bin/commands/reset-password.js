import { randomBytes, createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { executeD1, queryD1 } from "../lib/d1-query.js";
import { openNodeSqlite } from "../lib/node-sqlite.js";
import { resolveCliSite } from "../lib/site-selection.js";
import {
  getCliRuntimeLabel,
  resolveCliRuntime,
} from "../lib/runtime-target.js";

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      config: { type: "string" },
      database: { type: "string", default: "DB" },
      env: { type: "string" },
      local: { type: "boolean", default: false },
      "persist-to": { type: "string" },
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
    console.log("  --config  Wrangler config file (default: wrangler.toml)");
    console.log("  --env     Wrangler environment name");
    console.log("  --database D1 binding name (default: DB)");
    console.log("  --persist-to Local D1 state directory override");
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
      const { site } = await resolveCliSite(
        {
          async query(sql) {
            return sqlite.prepare(sql).all();
          },
          async execute(sql) {
            sqlite.exec(sql);
          },
        },
        {
          env: process.env,
          createIfMissing: true,
        },
      );

      sqlite
        .prepare(
          `
            INSERT INTO "site_setting" ("site_id", "key", "value", "updated_at")
            VALUES (?, ?, ?, ?)
            ON CONFLICT ("site_id", "key") DO UPDATE
            SET "value" = excluded."value",
                "updated_at" = excluded."updated_at"
          `,
        )
        .run(site.id, "PASSWORD_RESET_TOKEN", value, timestamp);
    } finally {
      sqlite.close();
    }
  } else {
    const d1Options = {
      configPath: values.config,
      database: values.database,
      env: values.env,
      persistTo: values["persist-to"],
    };
    const { site } = await resolveCliSite(
      {
        async query(sql) {
          return queryD1(sql, runtime, d1Options);
        },
        async execute(sql) {
          executeD1(sql, runtime, {
            ...d1Options,
            quiet: true,
          });
        },
      },
      {
        env: process.env,
        createIfMissing: true,
      },
    );

    const sql = `
      INSERT INTO "site_setting" ("site_id", "key", "value", "updated_at")
      VALUES ('${site.id}', 'PASSWORD_RESET_TOKEN', '${value}', ${timestamp})
      ON CONFLICT ("site_id", "key") DO UPDATE
      SET "value" = excluded."value",
          "updated_at" = excluded."updated_at"
    `;

    executeD1(sql, runtime, d1Options);
  }

  console.log("");
  console.log("Password reset token generated (expires in 15 minutes).");
  console.log(`Runtime: ${getCliRuntimeLabel(runtime)}`);
  console.log(`Visit: /reset?token=${token}`);
}
