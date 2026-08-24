/**
 * A logger that depends on every caller remembering not to log a secret will leak one eventually.
 * The caller who forgets is always the one handling something unusual, so redaction happens on the
 * way out rather than being asked of call sites.
 */
import { describe, expect, it } from "vitest";
import { redact } from "../src/obs/log.js";

describe("redaction happens on the way out", () => {
  it("removes values under secret-shaped keys", () => {
    const r = redact({ apiKey: "abc", authorization: "Bearer x", password: "hunter2", goal: "apply" }) as Record<string, unknown>;
    expect(r.apiKey).toBe("[redacted]");
    expect(r.authorization).toBe("[redacted]");
    expect(r.password).toBe("[redacted]");
    expect(r.goal, "an ordinary field was redacted").toBe("apply");
  });

  it("catches credential-shaped values even under an innocent key", () => {
    // The dangerous case: a key nobody thought to protect, carrying something that matters.
    const r = redact({ note: "use AIzaSyA1234567890abcdefghijklmnopqrstu to continue" }) as Record<string, unknown>;
    expect(r.note).toContain("[redacted-credential]");
    expect(r.note).not.toContain("AIzaSyA1234567890");
  });

  it("truncates page text — a log line is a signal, not a copy of the web", () => {
    const r = redact({ pageText: "x".repeat(5000) }) as Record<string, unknown>;
    expect(String(r.pageText).length).toBeLessThan(300);
    expect(String(r.pageText)).toContain("5000 chars");
  });

  it("redacts inside nested structures", () => {
    const r = redact({ mission: { executor: { token: "secret-value" } } }) as any;
    expect(r.mission.executor.token).toBe("[redacted]");
  });

  it("bounds arrays and recursion rather than trusting the input's shape", () => {
    expect((redact(Array.from({ length: 100 }, (_, i) => i)) as unknown[]).length).toBe(20);
    let deep: any = "bottom";
    for (let i = 0; i < 12; i++) deep = { next: deep };
    expect(JSON.stringify(redact(deep))).toContain("too deep");
  });

  it("leaves ordinary values intact — over-redaction makes logs useless", () => {
    const r = redact({ proven: 7, total: 8, outcome: "partial", url: "https://demo.test/x" }) as Record<string, unknown>;
    expect(r).toEqual({ proven: 7, total: 8, outcome: "partial", url: "https://demo.test/x" });
  });
});
