/**
 * THE RECEIPT IS THE DELIVERABLE.
 *
 * Everything else in this system exists so that this document can be trusted. So the tests here
 * are about what it is capable of SAYING — specifically, whether it can say unflattering things.
 * A report that can only describe success is marketing, and the way that failure usually arrives
 * is not a lie but an omission: a number that is technically correct next to a category the reader
 * was never shown.
 */
import { describe, expect, it } from "vitest";
import { buildReceipt } from "../src/core/receipt.js";
import { classifyFailure, newMission, type MissionState, type Step } from "../src/core/state.js";
import type { Evidence } from "../src/core/evidence.js";

const step = (over: Partial<Step> & { id: string }): Step => ({
  intent: over.id, action: { kind: "inspect" }, status: "pending", attempts: 0,
  lastObservation: null, reason: "", failure: null, ...over,
});
const withSteps = (steps: Step[]): MissionState => ({ ...newMission("m_1", "apply for the grant", "reference"), steps });
const build = (steps: Step[], over: Partial<Parameters<typeof buildReceipt>[0]> = {}) =>
  buildReceipt({
    state: withSteps(steps), evidence: [], verdicts: new Map(),
    executor: { name: "reference", preExisting: false }, model: { model: "gemini-3.5-flash" }, ...over,
  });

describe("the receipt separates work that happened from work that did not", () => {
  it("counts failed and unattempted separately — they are different facts", () => {
    const r = build([
      step({ id: "a", status: "proven" }),
      step({ id: "b", status: "failed" }),
      step({ id: "c", status: "skipped" }),
      step({ id: "d", status: "blocked" }),
    ]);
    expect(r.proven).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.unattempted, "skipped and blocked collapsed into one number or vanished").toBe(2);
  });

  it("never headlines a number without the shortfall beside it", () => {
    const r = build([step({ id: "a", status: "proven" }), step({ id: "b", status: "attempted" })]);
    expect(r.headline).toContain("Proven 1 of 2");
    expect(r.headline).toMatch(/not counted/i);
  });

  it("says plainly when there was no plan at all, rather than reporting zero of zero", () => {
    const r = build([]);
    expect(r.headline).toMatch(/no executable plan/i);
  });
});

describe("a failure says whether it could ever have worked", () => {
  it("carries the class and retryability onto the line", () => {
    const r = build([step({ id: "a", status: "failed", failure: classifyFailure("not_found", 'no field matching "Affiliation"') })]);
    expect(r.lines[0]!.failure).toEqual({ class: "not_found", retryable: false });
  });

  it("distinguishes could-not-work from did-not-work-this-time", () => {
    const r = build([
      step({ id: "a", status: "failed", failure: classifyFailure("not_found") }),
      step({ id: "b", status: "failed", failure: classifyFailure("transport") }),
    ]);
    expect(r.lines[0]!.failure!.retryable).toBe(false);
    expect(r.lines[1]!.failure!.retryable).toBe(true);
  });
});

describe("steps removed before execution are shown, not swallowed", () => {
  it("reports what the sanitiser dropped and why", () => {
    // The most common removal is a proof criterion that restated the action. A reader seeing that
    // learns something real about the plan they were given.
    const r = build([step({ id: "a", status: "proven" })], {
      dropped: [{ intent: "Submit the form", why: "its proof criterion restates the action" }],
    });
    expect(r.dropped).toHaveLength(1);
    expect(r.dropped[0]!.why).toContain("restates the action");
  });

  it("is empty for a clean plan", () => {
    expect(build([step({ id: "a", status: "proven" })]).dropped).toHaveLength(0);
  });
});

describe("provenance travels with the result", () => {
  const ev = (preExisting: boolean): Evidence => ({
    id: "ev_1", stepId: "a", at: "2026-08-24T00:00:00Z", action: { kind: "inspect" },
    url: "http://demo.test", excerpt: "x", identifiers: [], formState: [], sha256: "h",
    producedBy: { executor: preExisting ? "laspoh" : "reference", preExisting },
  });

  it("flags a receipt whose evidence came through the disclosed pre-existing runtime", () => {
    const r = build([step({ id: "a", status: "proven" })], { evidence: [ev(true)] });
    expect(r.usedPreExistingExecutor, "a result gathered through pre-existing work did not say so").toBe(true);
  });

  it("does not flag one that did not", () => {
    const r = build([step({ id: "a", status: "proven" })], { evidence: [ev(false)] });
    expect(r.usedPreExistingExecutor).toBe(false);
  });

  it("records the model and executor that produced it", () => {
    const r = build([step({ id: "a", status: "proven" })]);
    expect(r.executor).toEqual({ name: "reference", preExisting: false });
    expect(r.model.model).toBe("gemini-3.5-flash");
  });
});

describe("the receipt cannot be edited without detection", () => {
  it("the integrity hash changes when the evidence chain does", () => {
    const mk = (sha: string): Evidence => ({
      id: "e", stepId: "a", at: "t", action: { kind: "inspect" }, url: "u",
      excerpt: "x", identifiers: [], formState: [], sha256: sha,
      producedBy: { executor: "reference", preExisting: false },
    });
    const a = build([step({ id: "a", status: "proven" })], { evidence: [mk("aaa")] });
    const b = build([step({ id: "a", status: "proven" })], { evidence: [mk("bbb")] });
    expect(a.integrity).not.toBe(b.integrity);
  });
});

// ONE MISSION, ONE ID. The server mints the public id at POST time; the orchestrator used to mint
// a second one, so every receipt named a missionId that matched no mission URL, no event stream
// and no Cloud Logging filter — discovered by curling a live deployment and comparing. The receipt
// exists so a judge can correlate it against the logs; an uncorrelatable id defeats the artifact.
//
// The flows are mocked at the module seam: this pins ID PLUMBING, and must not need a model.
vi.mock("../src/flows/plan.js", () => ({
  planFlow: async () => ({ steps: [{ intent: "do a thing", action: { kind: "navigate", url: "http://localhost:1/x" }, provenBy: "the thing is visibly done" }] }),
}));
vi.mock("../src/flows/verify.js", () => ({
  verifyFlow: async () => ({ verdict: "unproven", citedEvidence: [], reasoning: "mocked" }),
}));
vi.mock("../src/flows/repair.js", () => ({
  repairFlow: async () => ({ values: [] }),
}));

import { vi } from "vitest";
import { runMission } from "../src/core/orchestrator.js";
import type { Executor } from "../src/executors/types.js";

describe("the receipt carries the caller's mission id", () => {
  const inert = {
    name: "inert",
    preExisting: false,
    execute: async () => ({ ok: false, failure: "transport", detail: "inert test executor", url: "", title: "", excerpt: "", identifiers: [], formState: [], outstandingRequired: [] }),
  } as unknown as Executor;

  it("threads the id from RunOptions through state to the receipt", async () => {
    const { receipt } = await runMission({ goal: "test goal", executor: inert, maxSteps: 1, missionId: "m_fixedid1" });
    expect(receipt.missionId).toBe("m_fixedid1");
  });

  it("still mints its own when no id is given — library use stays valid", async () => {
    const { receipt } = await runMission({ goal: "test goal", executor: inert, maxSteps: 1 });
    expect(receipt.missionId).toMatch(/^m_[0-9a-f]{8}$/);
  });
});
