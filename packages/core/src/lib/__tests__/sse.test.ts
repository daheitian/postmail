import { describe, it, expect } from "vitest";
import { dsRedirect, dsToast, dsSignals } from "../sse.js";

describe("dsRedirect", () => {
  it("returns a Response with text/html content-type", () => {
    const res = dsRedirect("/dash");
    expect(res.headers.get("Content-Type")).toBe("text/html");
  });

  it("includes Datastar headers for append mode", () => {
    const res = dsRedirect("/dash");
    expect(res.headers.get("Datastar-Mode")).toBe("append");
    expect(res.headers.get("Datastar-Selector")).toBe("body");
  });

  it("body contains redirect script with correct URL", async () => {
    const res = dsRedirect("/dash/posts");
    const body = await res.text();
    expect(body).toContain("window.location.href='/dash/posts'");
  });

  it("escapes single quotes in URL", async () => {
    const res = dsRedirect("/path/with'quote");
    const body = await res.text();
    expect(body).toContain("\\'");
  });

  it("merges additional headers", () => {
    const res = dsRedirect("/dash", {
      headers: { "Set-Cookie": "session=abc" },
    });
    expect(res.headers.get("Set-Cookie")).toBe("session=abc");
    expect(res.headers.get("Content-Type")).toBe("text/html");
  });
});

describe("dsToast", () => {
  it("returns text/html content-type", () => {
    const res = dsToast("Saved!");
    expect(res.headers.get("Content-Type")).toBe("text/html");
  });

  it("targets #toast-container", () => {
    const res = dsToast("Saved!");
    expect(res.headers.get("Datastar-Selector")).toBe("#toast-container");
    expect(res.headers.get("Datastar-Mode")).toBe("append");
  });

  it("defaults to success type", async () => {
    const res = dsToast("Saved!");
    const body = await res.text();
    expect(body).toContain("toast-success");
  });

  it("supports error type", async () => {
    const res = dsToast("Failed!", "error");
    const body = await res.text();
    expect(body).toContain("toast-error");
  });

  it("escapes HTML in message", async () => {
    const res = dsToast("<script>alert('xss')</script>");
    const body = await res.text();
    expect(body).not.toContain("<script>alert");
    expect(body).toContain("&lt;script&gt;");
  });
});

describe("dsSignals", () => {
  it("returns application/json content-type", () => {
    const res = dsSignals({ count: 1 });
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("body contains JSON-serialized signals", async () => {
    const res = dsSignals({ _error: "File too large", count: 42 });
    const body = await res.json();
    expect(body).toEqual({ _error: "File too large", count: 42 });
  });

  it("handles empty signals", async () => {
    const res = dsSignals({});
    const body = await res.json();
    expect(body).toEqual({});
  });
});
