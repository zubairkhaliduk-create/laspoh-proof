/**
 * The executor against a real browser and a real form.
 *
 * These exist because of a bug that cost a whole demo run: the DOM read threw inside the page
 * (a bundler helper that does not exist on that side of the boundary), the throw was caught, and
 * the form reported itself as having no fields. Nothing errored. The agent simply went blind, and
 * every downstream symptom — a submit with required fields empty, fills that could never be proven
 * — pointed somewhere else entirely.
 *
 * A silent read failure is indistinguishable from an empty form, so it has to be tested against a
 * form that is definitely not empty.
 */
import express from "express";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mountDemoTarget } from "../src/demo/target.js";
import { ReferenceExecutor } from "../src/executors/reference.js";

let server: Server;
let base: string;
let exec: ReferenceExecutor;

beforeAll(async () => {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  mountDemoTarget(app);
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  exec = new ReferenceExecutor(true);
  await exec.execute({ kind: "navigate", url: `${base}/demo` });
}, 60_000);

afterAll(async () => {
  await exec?.close();
  server?.close();
});

describe("what the executor can see", () => {
  it("reads the required fields the form actually has", async () => {
    const obs = await exec.execute({ kind: "inspect" });
    expect(obs.outstandingRequired.length).toBeGreaterThan(0);
    expect(obs.outstandingRequired.join(" | ")).toMatch(/Full name/i);
  });

  it("reports form values, which never appear in visible page text", async () => {
    const obs = await exec.execute({ kind: "fill", field: "Full name", value: "Ada Lovelace" });
    expect(obs.ok).toBe(true);
    expect(obs.formState.join(" | ")).toContain("Full name = Ada Lovelace");
    // The point of the whole field: this value is invisible to a text-only reading of the page.
    expect(obs.pageText).not.toContain("Ada Lovelace");
  });

  it("drops a filled field off the outstanding list", async () => {
    const obs = await exec.execute({ kind: "inspect" });
    expect(obs.outstandingRequired.join(" | ")).not.toMatch(/Full name/i);
  });

  it("counts ticking a checkbox as a real effect, though no page text changes", async () => {
    const obs = await exec.execute({ kind: "click", target: "I confirm" });
    expect(obs.ok).toBe(true);
    expect(obs.failure).toBeNull();
    expect(obs.formState.join(" | ")).toMatch(/= checked/);
  });

  it("reports a missing control as not_found rather than inventing one", async () => {
    const obs = await exec.execute({ kind: "fill", field: "Affiliation", value: "Independent" });
    expect(obs.ok).toBe(false);
    expect(obs.failure).toBe("not_found");
  });

  it("refuses to call an incomplete submission a success", async () => {
    // Role is still unset, so the server rejects. The click fires; the mission does not advance.
    const obs = await exec.execute({ kind: "click", target: "Submit application" });
    expect(obs.identifiers.some((i) => i.startsWith("GR-"))).toBe(false);
    expect(obs.pageText).toMatch(/Rejected/i);
  });

  it("sets a native dropdown by value and reads the choice back", async () => {
    const obs = await exec.execute({ kind: "select", field: "Applying as", value: "Independent researcher" });
    expect(obs.ok).toBe(true);
    expect(obs.formState.join(" | ")).toContain("Applying as = Independent researcher");
  });
});
