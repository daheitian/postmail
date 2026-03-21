import * as sqliteSchema from "./schema.js";
import * as pgSchema from "./pg/schema.js";

export type DatabaseSchema = typeof sqliteSchema;

export const sqliteSchemaBundle: DatabaseSchema = sqliteSchema;

// Drizzle table objects are dialect-specific at runtime, but Jant's service
// layer consumes a stable domain-shaped schema bundle. Postgres uses the same
// table names and column names, so we normalize the bundle shape here and keep
// the runtime-specific table instances intact.
export const pgSchemaBundle = pgSchema as unknown as DatabaseSchema;
