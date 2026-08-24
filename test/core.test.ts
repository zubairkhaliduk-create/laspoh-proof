import { describe, expect, it } from "vitest";
import { classifyFailure } from "../src/core/state.js";
import { decide, isBlindRepeat, isWandering, WANDERING_BOUND, WANDERING_MIN_STEPS , worthRetrying } from "../src/core/recovery.js";
import { newMission, noteStep, provenCount, terminalStatus, type MissionState } from "../src/core/state.js";
import { buildReceipt } from "../src/core/receipt.js";

/**
 * These pin the guarantees that must hold no matter what the model says. Every one of them
 * encodes a failure observed in a production browser agent, not a hypothetical.
 */

const mission = (steps: Array<{ status: string }>): MissionState => ({
  ...newMission("m1", "goal", "reference"),
  steps: steps.map((s, i) => ({ id: `s${i}`, intent: `step ${i}`, action: { kind: "inspect" } as never, status: s.status as never, attempts: 1, lastObservation: null, reason: "" })),
});

describe("success is counted only from proven work", () => {
  it("attempted steps never count — a dispatched action is not an achieved outcome", () => {
    const m = mission([{ status: "attempted" }, { status: "attempted" }, { status: "attempted" }]);
    expect(provenCount(m)).toBe(0);
    expect(terminalStatus(m)).toBe("blocked");
  });

  it("a partial result reports the true number rather than rounding up", () => {
    const m = mission([{ status: "proven" }, { status: "proven" }, { status: "attempted" }, { status: "failed" }]);
    expect(provenCount(m)).toBe(2);
    expect(terminalStatus(m)).toBe("partial");
  });

  it("complete requires EVERY step proven", () => {
    expect(terminalStatus(mission([{ status: "proven" }, { status: "proven" }]))).toBe("complete");
    expect(terminalStatus(mission([{ status: "proven" }, { status: "attempted" }]))).toBe("partial");
  });
});

describe("progress is measured in proven work, not page churn", () => {
  it("the no-progress counter rises while nothing is proven", () => {
    let m = mission([{ status: "attempted" }]);
    m = noteStep(m, 0);
    m = noteStep(m, 0);
    expect(m.stepsSinceProgress).toBe(2);
  });

  it("and resets only when proven work actually rises", () => {
    let m = mission([{ status: "proven" }]);
    m = { ...m, stepsSinceProgress: 5, escalated: true };
    m = noteStep(m, 0); // provenBefore 0, now 1 → real progress
    expect(m.stepsSinceProgress).toBe(0);
    expect(m.escalated).toBe(false);
  });
});

describe("recovery refuses to spend on hopeless repetition", () => {
  it("the same attempt with nothing changed is refused", () => {
    expect(isBlindRepeat({ attempts: 2, worldChangedSinceLastAttempt: false })).toBe(true);
  });
  it("but a changed world earns another try", () => {
    expect(isBlindRepeat({ attempts: 5, worldChangedSinceLastAttempt: true })).toBe(false);
  });
});

describe("the wandering stall — busy, succeeding, proving nothing", () => {
  const g = (o: Partial<Parameters<typeof isWandering>[0]> = {}) => ({
    stepsSinceProgress: WANDERING_BOUND, totalSteps: 20, alreadyEscalated: false, hasKnownNextAction: false, ...o,
  });

  it("fires when many steps have proven nothing", () => {
    expect(isWandering(g())).toBe(true);
  });

  it("stays silent when the PAGE states the next action — that is honest work, not wandering", () => {
    // The regression this encodes: escalating here pushes an agent to submit an incomplete form.
    expect(isWandering(g({ hasKnownNextAction: true, stepsSinceProgress: 999 }))).toBe(false);
    expect(decide({ ...g({ hasKnownNextAction: true }), attempts: 9, worldChangedSinceLastAttempt: false, humanAvailable: true }).kind).toBe("continue");
  });

  it("stays silent during the opening — navigating and reading bank nothing yet", () => {
    expect(isWandering(g({ totalSteps: WANDERING_MIN_STEPS - 1, stepsSinceProgress: 999 }))).toBe(false);
  });

  it("fires once, not on every subsequent step", () => {
    expect(isWandering(g({ alreadyEscalated: true }))).toBe(false);
  });
});

describe("the receipt is capable of being unflattering", () => {
  it("a partial run says so plainly and never reads as done", () => {
    const m = mission([{ status: "proven" }, { status: "attempted" }, { status: "failed" }]);
    const r = buildReceipt({ state: m, evidence: [], verdicts: new Map(), executor: { name: "reference", preExisting: false }, model: {} });
    expect(r.outcome).toBe("partial");
    expect(r.proven).toBe(1);
    expect(r.total).toBe(3);
    expect(r.headline).toContain("1 of 3");
    expect(r.headline.toLowerCase()).not.toContain("success");
  });

  it("a run that proved nothing does not present as a result", () => {
    const r = buildReceipt({ state: mission([{ status: "attempted" }]), evidence: [], verdicts: new Map(), executor: { name: "reference", preExisting: false }, model: {} });
    expect(r.outcome).toBe("blocked");
    expect(r.proven).toBe(0);
    expect(r.headline).toContain("Nothing could be proven");
  });

  it("records which executor produced it, and whether that executor is pre-existing work", () => {
    const r = buildReceipt({ state: mission([{ status: "proven" }]), evidence: [], verdicts: new Map(), executor: { name: "laspoh", preExisting: true }, model: {} });
    expect(r.executor).toEqual({ name: "laspoh", preExisting: true });
  });
});

describe("retrying only what could work", () => {
  it("does not retry a control that does not exist", () => {
    // Before the failure was typed, recovery inferred this from prose. That is how a loop ends up
    // re-attempting something that can never succeed, burning budget to reach the same answer.
    expect(worthRetrying(classifyFailure("not_found"), 0)).toBe(false);
    expect(worthRetrying(classifyFailure("policy_refused"), 0)).toBe(false);
  });

  it("retries a transport blip, within a bound", () => {
    expect(worthRetrying(classifyFailure("transport"), 0)).toBe(true);
    expect(worthRetrying(classifyFailure("transport"), 1)).toBe(true);
    expect(worthRetrying(classifyFailure("transport"), 2), "unbounded retry is a loop").toBe(false);
  });

  it("treats an absent failure as nothing to retry", () => {
    expect(worthRetrying(null, 0)).toBe(false);
    expect(worthRetrying(undefined, 0)).toBe(false);
  });
});
