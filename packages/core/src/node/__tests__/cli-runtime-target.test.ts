import { describe, expect, it } from "vitest";
import { resolveCliRuntime } from "../../../bin/lib/runtime-target.js";

describe("resolveCliRuntime", () => {
  it("prefers the Node database runtime when DATABASE_URL is present", () => {
    expect(
      resolveCliRuntime(
        { local: false, remote: false },
        { DATABASE_URL: "file:./jant.sqlite" },
      ),
    ).toBe("node");
  });

  it("allows explicit local D1 override", () => {
    expect(
      resolveCliRuntime(
        { local: true, remote: false },
        { DATABASE_URL: "file:./jant.sqlite" },
      ),
    ).toBe("d1-local");
  });

  it("prefers the Node database runtime when DATA_DIR is present", () => {
    expect(
      resolveCliRuntime(
        { local: false, remote: false },
        { DATA_DIR: "./data" },
      ),
    ).toBe("node");
  });

  it("rejects conflicting runtime flags", () => {
    expect(() => resolveCliRuntime({ local: true, remote: true }, {})).toThrow(
      /Choose only one of --local, --remote/,
    );
  });
});
