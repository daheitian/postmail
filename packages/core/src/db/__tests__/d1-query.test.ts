import { describe, expect, it } from "vitest";
import { parseWranglerError } from "../../../bin/lib/d1-query.js";

describe("d1-query Wrangler error parsing", () => {
  it("keeps Cloudflare note details in the surfaced error", () => {
    const output = JSON.stringify({
      error: {
        text: "API request failed.",
        notes: [{ text: "The given account is not valid [code: 7403]" }],
      },
    });

    expect(parseWranglerError(output)).toBe(
      "API request failed. (The given account is not valid [code: 7403])",
    );
  });
});
