import { describe, expect, it } from "vitest";
import {
  describePostgresTarget,
  formatNavItemConstraintSummary,
  formatPgMigrationJournalSummary,
  isMigrationDebugEnabled,
  wrapPostgresConnectionError,
} from "../node.js";

describe("describePostgresTarget", () => {
  it("formats a safe postgres target without leaking the password", () => {
    expect(
      describePostgresTarget(
        "postgres://app_user:super-secret@localhost:5432/jant_dev",
      ),
    ).toBe("postgres://app_user@localhost:5432/jant_dev");
  });
});

describe("isMigrationDebugEnabled", () => {
  it("only enables migration debug logging when the flag is set", () => {
    expect(isMigrationDebugEnabled({ JANT_DEBUG_MIGRATE: "1" })).toBe(true);
    expect(isMigrationDebugEnabled({ JANT_DEBUG_MIGRATE: "true" })).toBe(false);
    expect(isMigrationDebugEnabled({})).toBe(false);
  });
});

describe("formatPgMigrationJournalSummary", () => {
  it("includes the applied and expected migration counts", () => {
    expect(
      formatPgMigrationJournalSummary(
        [{ id: 8, hash: "hash-8", created_at: 1775349118 }],
        10,
      ),
    ).toBe("count=1/10 latest_id=8 latest_created_at=1775349118");
  });

  it("handles an empty migration journal", () => {
    expect(formatPgMigrationJournalSummary([], 8)).toBe("count=0/8");
  });
});

describe("formatNavItemConstraintSummary", () => {
  it("shows both nav_item check constraints and marks missing ones", () => {
    expect(
      formatNavItemConstraintSummary({
        chk_nav_item_system_key: "CHECK ((system_key IS NULL))",
      }),
    ).toBe(
      "chk_nav_item_placement=<missing>; chk_nav_item_system_key=CHECK ((system_key IS NULL))",
    );
  });
});

describe("wrapPostgresConnectionError", () => {
  it("turns authentication failures into a clear configuration error", () => {
    const cause = Object.assign(new Error("password authentication failed"), {
      code: "28P01",
    });

    const error = wrapPostgresConnectionError(
      cause,
      "postgres://app_user:super-secret@localhost:5432/jant_dev",
      "migrate",
    );

    expect(error.message).toContain(
      "Postgres authentication failed while attempting to migrate",
    );
    expect(error.message).toContain(
      "postgres://app_user@localhost:5432/jant_dev",
    );
    expect(error.message).not.toContain("super-secret");
    expect(error.cause).toBe(cause);
  });

  it("turns missing database errors into a clear configuration error", () => {
    const cause = Object.assign(
      new Error('database "jant_dev" does not exist'),
      {
        code: "3D000",
      },
    );

    const error = wrapPostgresConnectionError(
      cause,
      "postgres://app_user:super-secret@localhost:5432/jant_dev",
      "connect",
    );

    expect(error.message).toContain(
      "Postgres database does not exist while attempting to connect",
    );
    expect(error.cause).toBe(cause);
  });
});
