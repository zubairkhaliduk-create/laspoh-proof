import { describe, expect, it, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { mountDemoTarget } from "../src/demo/target.js";
import { ReferenceExecutor } from "../src/executors/reference.js";

/**
 * THE EXECUTOR AGAINST A REAL BROWSER AND A REAL SERVER.
 *
 * No model here on purpose: this proves the ACTUATION half is honest, independently of anything
 * Gemini says. The properties under test are the ones a confident agent most often gets wrong —
 * that a fill really landed, that a click really changed something, and that submitting an
 * incomplete form is reported as the failure it is rather than as a submission.
 */
let server: Server;
let base: string;
let exec: ReferenceExecutor;

beforeAll(async () => {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  mountDemoTarget(app);
  await new Promise<void>((r) => { server = app.listen(0, () => r()); });
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  exec = new ReferenceExecutor(true);
}, 120_000);

afterAll(async () => { await exec?.close(); server?.close(); });

describe("the reference executor reports what happened, not what was attempted", () => {
  it("navigates and sees the form's required fields as ground truth", async () => {
    const obs = await exec.execute({ kind: "navigate", url: `${base}/demo` });
    expect(obs.ok).toBe(true);
    // Read from the DOM, not inferred by a model: this is what lets the agent know the form is
    // incomplete without asking anyone's opinion.
    expect(obs.outstandingRequired.length).toBeGreaterThan(0);
  }, 60_000);

  it("a fill is ok ONLY when the value actually stayed in the field", async () => {
    await exec.execute({ kind: "navigate", url: `${base}/demo` });
    const ok = await exec.execute({ kind: "fill", field: "Full name", value: "Ada Lovelace" });
    expect(ok.ok).toBe(true);
    const missing = await exec.execute({ kind: "fill", field: "Nonexistent Field", value: "x" });
    expect(missing.ok).toBe(false);
    expect(missing.failure).toBe("not_found");
  }, 60_000);

  it("submitting with a required item unticked is a REJECTION, and is reported as one", async () => {
    await exec.execute({ kind: "navigate", url: `${base}/demo` });
    await exec.execute({ kind: "fill", field: "Full name", value: "Ada Lovelace" });
    await exec.execute({ kind: "fill", field: "Email address", value: "ada@example.com" });
    // consent deliberately left unticked — the exact mistake a hurried agent makes
    const submitted = await exec.execute({ kind: "click", target: "Submit application" });
    // The page changed (a rejection appeared), so the CLICK is ok — but the outcome is not success,
    // and nothing in this observation claims it is. That distinction is the whole thesis.
    expect(submitted.pageText).not.toContain("Confirmation reference");
    expect(submitted.identifiers.some((i) => i.startsWith("GR-"))).toBe(false);
  }, 60_000);

  it("a complete submission yields a confirmation reference — the only real proof", async () => {
    await exec.execute({ kind: "navigate", url: `${base}/demo` });
    await exec.execute({ kind: "fill", field: "Full name", value: "Ada Lovelace" });
    await exec.execute({ kind: "fill", field: "Email address", value: "ada@example.com" });
    await exec.execute({ kind: "select", field: "Applying as", value: "Independent researcher" });
    await exec.execute({ kind: "click", target: "I confirm the information" });
    const done = await exec.execute({ kind: "click", target: "Submit application" });
    expect(done.pageText).toContain("Confirmation reference");
    expect(done.identifiers.some((i) => i.startsWith("GR-"))).toBe(true);
  }, 60_000);
});
