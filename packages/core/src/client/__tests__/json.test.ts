import { describe, expect, it } from "vitest";

import {
  readErrorMessage,
  readErrorMessageFromText,
  readJsonObject,
} from "../json.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

describe("readJsonObject", () => {
  it("parses a JSON object body", async () => {
    const res = jsonResponse({ id: "abc", count: 2 });
    expect(await readJsonObject(res)).toEqual({ id: "abc", count: 2 });
  });

  it("returns empty object for empty body", async () => {
    const res = new Response("", { status: 200 });
    expect(await readJsonObject(res)).toEqual({});
  });

  it("returns empty object for a JSON primitive", async () => {
    expect(await readJsonObject(jsonResponse("hi"))).toEqual({});
  });

  it("throws an informative error when body is not JSON", async () => {
    const res = textResponse("Not Found", 404);
    await expect(readJsonObject(res)).rejects.toThrow(
      /Expected JSON \(HTTP 404\) but got: Not Found/,
    );
  });
});

describe("readErrorMessage", () => {
  it("returns the JSON `error` field when present", async () => {
    const res = jsonResponse({ error: "Quota exceeded" }, 400);
    expect(await readErrorMessage(res, "Default")).toBe("Quota exceeded");
  });

  it("surfaces plain-text body when not JSON (the Not Found case)", async () => {
    const res = textResponse("Not Found", 404);
    expect(await readErrorMessage(res, "Failed to start upload")).toBe(
      "Not Found",
    );
  });

  it("falls back when body is empty", async () => {
    const res = new Response("", { status: 500 });
    expect(await readErrorMessage(res, "Default")).toBe("Default");
  });

  it("truncates very long bodies (e.g. error HTML pages)", async () => {
    const long = "x".repeat(500);
    const res = textResponse(long, 502);
    const result = await readErrorMessage(res, "Default");
    expect(result.length).toBeLessThanOrEqual(201);
    expect(result.endsWith("…")).toBe(true);
  });

  it("falls back when JSON has no `error` field", async () => {
    const res = jsonResponse({ status: "bad" }, 400);
    expect(await readErrorMessage(res, "Default")).toBe('{"status":"bad"}');
  });
});

describe("readErrorMessageFromText", () => {
  it("extracts error from JSON text", () => {
    expect(
      readErrorMessageFromText('{"error":"part too small"}', "Default"),
    ).toBe("part too small");
  });

  it("returns plain text when not JSON", () => {
    expect(readErrorMessageFromText("Internal Error", "Default")).toBe(
      "Internal Error",
    );
  });

  it("falls back when text is blank", () => {
    expect(readErrorMessageFromText("   ", "Default")).toBe("Default");
  });
});
