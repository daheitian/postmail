import { describe, expect, it } from "vitest";
import {
  isPostgresDatabaseUrl,
  isSqliteDatabaseUrl,
  resolveDatabaseDialect,
} from "../dialect.js";

describe("resolveDatabaseDialect", () => {
  it("recognizes SQLite file URLs", () => {
    expect(resolveDatabaseDialect("file:./data/jant.sqlite")).toBe("sqlite");
  });

  it("recognizes SQLite in-memory URLs", () => {
    expect(resolveDatabaseDialect("file::memory:")).toBe("sqlite");
    expect(resolveDatabaseDialect(":memory:")).toBe("sqlite");
  });

  it("recognizes postgres URLs", () => {
    expect(resolveDatabaseDialect("postgres://localhost:5432/jant")).toBe("pg");
    expect(resolveDatabaseDialect("postgresql://localhost:5432/jant")).toBe(
      "pg",
    );
  });

  it("rejects unsupported schemes", () => {
    expect(() => resolveDatabaseDialect("mysql://localhost/jant")).toThrow(
      /file:, postgres:, or postgresql:/,
    );
  });
});

describe("database URL helpers", () => {
  it("reports SQLite URLs correctly", () => {
    expect(isSqliteDatabaseUrl("file:./data/jant.sqlite")).toBe(true);
    expect(isSqliteDatabaseUrl("postgres://localhost:5432/jant")).toBe(false);
  });

  it("reports Postgres URLs correctly", () => {
    expect(isPostgresDatabaseUrl("postgres://localhost:5432/jant")).toBe(true);
    expect(isPostgresDatabaseUrl("file:./data/jant.sqlite")).toBe(false);
  });
});
