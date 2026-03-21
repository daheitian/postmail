import { describe, expect, it } from "vitest";
import {
  describePostgresTarget,
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
