import { describe, expect, it } from "vitest";
import {
  assertSnapshotDialectMatches,
  assertSnapshotMeta,
  buildSnapshotMeta,
  getSnapshotDialect,
} from "../../../bin/lib/site-snapshot.js";

const SITE = { id: "sit_test", key: "default" };

describe("buildSnapshotMeta", () => {
  it("includes the dialect when provided", () => {
    const meta = buildSnapshotMeta(SITE, { dialect: "pg" });
    expect(meta.dialect).toBe("pg");
    expect(meta.site).toEqual({ id: "sit_test", key: "default" });
  });

  it("omits the dialect field when not provided (back-compat)", () => {
    const meta = buildSnapshotMeta(SITE);
    expect("dialect" in meta).toBe(false);
  });

  it("rejects unknown dialects at build time", () => {
    expect(() => buildSnapshotMeta(SITE, { dialect: "mysql" })).toThrow(
      /Unsupported snapshot dialect/,
    );
  });
});

describe("assertSnapshotMeta", () => {
  it("accepts a known dialect", () => {
    expect(() =>
      assertSnapshotMeta(buildSnapshotMeta(SITE, { dialect: "sqlite" })),
    ).not.toThrow();
  });

  it("accepts a snapshot without a dialect (legacy)", () => {
    expect(() => assertSnapshotMeta(buildSnapshotMeta(SITE))).not.toThrow();
  });

  it("rejects an unknown dialect at read time", () => {
    expect(() =>
      assertSnapshotMeta({
        format: "jant-site-snapshot",
        version: 1,
        dialect: "mysql",
        site: SITE,
      }),
    ).toThrow(/Snapshot meta has unsupported dialect/);
  });
});

describe("getSnapshotDialect", () => {
  it("returns the dialect when valid", () => {
    expect(getSnapshotDialect({ dialect: "pg" })).toBe("pg");
    expect(getSnapshotDialect({ dialect: "sqlite" })).toBe("sqlite");
  });

  it("returns undefined for missing or invalid dialect", () => {
    expect(getSnapshotDialect({})).toBeUndefined();
    expect(getSnapshotDialect({ dialect: "mysql" })).toBeUndefined();
    expect(getSnapshotDialect(null)).toBeUndefined();
  });
});

describe("assertSnapshotDialectMatches", () => {
  it("passes when source and target dialects match", () => {
    expect(() =>
      assertSnapshotDialectMatches({ dialect: "pg" }, "pg"),
    ).not.toThrow();
  });

  it("throws a descriptive error when dialects mismatch", () => {
    expect(() =>
      assertSnapshotDialectMatches({ dialect: "sqlite" }, "pg"),
    ).toThrow(/Snapshot dialect mismatch.*source is sqlite.*target is pg/s);
  });

  it("skips validation when the snapshot predates the dialect field", () => {
    // Older snapshots have no dialect field — we don't know the source, so we
    // can't refuse them. The user opts into the looser check by importing
    // legacy snapshots; cross-dialect SQL errors will surface mid-import.
    expect(() => assertSnapshotDialectMatches({}, "pg")).not.toThrow();
  });
});
