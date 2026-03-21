import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/pg/schema.ts",
  out: "./src/db/migrations/pg",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@127.0.0.1:5432/jant",
  },
});
