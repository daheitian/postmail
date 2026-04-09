import { describe, expect, it } from "vitest";
import { isCodeEditorHtml } from "../markdown-clipboard.js";

describe("isCodeEditorHtml", () => {
  it("detects VS Code HTML via data-vscode attribute", () => {
    const html = `<meta charset='utf-8'><div style="color: #d4d4d4;background-color: #1e1e1e;" data-vscode-theme-name="Default Dark+"><div style="line-height:18px"><span style="color: #569cd6;">const</span> x = 1;</div></div>`;
    expect(isCodeEditorHtml(html)).toBe(true);
  });

  it("detects Cursor / VS Code fork without data-vscode attribute", () => {
    const html = `<meta charset='utf-8'><div style="color: #bbbebf;background-color: #121314;font-family: Menlo, Monaco, 'Courier New', monospace;font-weight: normal;font-size: 12px;line-height: 24px;white-space: pre;"><div><span style="color: #79c0ff;font-weight: bold;">## Hello</span></div></div>`;
    expect(isCodeEditorHtml(html)).toBe(true);
  });

  it("detects JetBrains IDE HTML", () => {
    const html = `<html><body><pre style="background-color:#2b2b2b;color:#a9b7c6;font-family:'JetBrains Mono',monospace;font-size:13.0pt;white-space: pre;">const x = 1;</pre></body></html>`;
    expect(isCodeEditorHtml(html)).toBe(true);
  });

  it("detects generic monospace + pre style with Consolas", () => {
    const html = `<div style="font-family: Consolas, 'Courier New', monospace; white-space: pre; color: #fff;">hello</div>`;
    expect(isCodeEditorHtml(html)).toBe(true);
  });

  it("returns false for regular rich text HTML", () => {
    const html = `<p>Hello <strong>world</strong></p>`;
    expect(isCodeEditorHtml(html)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isCodeEditorHtml("")).toBe(false);
  });

  it("returns false for plain pre/code without editor markers", () => {
    const html = `<pre><code>some code</code></pre>`;
    expect(isCodeEditorHtml(html)).toBe(false);
  });

  it("returns false for monospace font without white-space: pre", () => {
    const html = `<div style="font-family: monospace; color: #333;">not from editor</div>`;
    expect(isCodeEditorHtml(html)).toBe(false);
  });

  it("returns false for white-space: pre without monospace font", () => {
    const html = `<div style="font-family: Arial, sans-serif; white-space: pre;">preformatted</div>`;
    expect(isCodeEditorHtml(html)).toBe(false);
  });
});
