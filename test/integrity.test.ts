/**
 * The claims this project actually makes, tested without a model in the loop.
 *
 * Every test here is aimed at one failure mode: a system reporting success it cannot back. The
 * model is deliberately absent — these guarantees must hold because of code, not because of a
 * prompt a model may or may not honour on a given day.
 */
import { describe, expect, it } from "vitest";
import { enforceCitation } from "../src/flows/verify.js";
import { alreadySatisfied, unaddressedRequired } from "../src/core/orchestrator.js";
import { classifyFailure, newMission, noteStep, provenCount, terminalStatus, unattemptedCount, type MissionState, type Step, type StepStatus } from "../src/core/state.js";
import { decide } from "../src/core/recovery.js";
import type { Action } from "../src/executors/types.js";

const step = (over: Partial<Step> & { id: string }): Step => ({
  intent: "", action: { kind: "inspect" }, status: "pending", attempts: 0, lastObservation: null, reason: "", failure: null, ...over,
});
const withSteps = (steps: Step[]): MissionState => ({ ...newMission("m", "goal", "reference"), steps });

describe("the citation rule", () => {
  it("downgrades a proven verdict that cites nothing", () => {
    const v = enforceCitation({ verdict: "proven", citedEvidence: [], reasoning: "it looked right" });
    expect(v.verdict).toBe("unproven");
    // The downgrade must be visible, not silent: the original claim survives in the reasoning.
    expect(v.reasoning).toContain("it looked right");
  });

  it("treats blank citations as no citation — whitespace is not evidence", () => {
    expect(enforceCitation({ verdict: "proven", citedEvidence: ["  ", ""] }).verdict).toBe("unproven");
  });

  it("keeps a proven verdict that quotes the evidence", () => {
    const v = enforceCitation({ verdict: "proven", citedEvidence: ["Confirmation reference: GR-481902"], reasoning: "shown on the page" });
    expect(v.verdict).toBe("proven");
    expect(v.citedEvidence).toEqual(["Confirmation reference: GR-481902"]);
  });

  it("never upgrades: contradicted and unproven pass through untouched", () => {
    expect(enforceCitation({ verdict: "contradicted", citedEvidence: ["Rejected."] }).verdict).toBe("contradicted");
    expect(enforceCitation({ verdict: "unproven" }).verdict).toBe("unproven");
  });
});

describe("success accounting", () => {
  it("counts only proven steps — attempted work is activity, not progress", () => {
    const s = withSteps([step({ id: "a", status: "proven" }), step({ id: "b", status: "attempted" }), step({ id: "c", status: "failed" })]);
    expect(provenCount(s)).toBe(1);
  });

  it("refuses `complete` unless every step is proven", () => {
    expect(terminalStatus(withSteps([step({ id: "a", status: "proven" }), step({ id: "b", status: "attempted" })]))).toBe("partial");
    expect(terminalStatus(withSteps([step({ id: "a", status: "proven" })]))).toBe("complete");
    expect(terminalStatus(withSteps([step({ id: "a", status: "attempted" })]))).toBe("blocked");
  });

  it("does not clear the stall counter for work that was merely attempted", () => {
    const before = withSteps([step({ id: "a", status: "attempted" })]);
    expect(noteStep(before, 0).stepsSinceProgress).toBe(1);
    const after = withSteps([step({ id: "a", status: "proven" })]);
    expect(noteStep(after, 0).stepsSinceProgress).toBe(0);
  });
});

describe("the blind-submit gate", () => {
  const pending = (...actions: Action[]) => actions.map((action) => ({ action }));

  it("flags a required control that no remaining step would fill", () => {
    const out = unaddressedRequired(
      ["Full name", "Applying as", "I confirm the information given is accurate"],
      pending({ kind: "fill", field: "Full name", value: "Ada Lovelace" }, { kind: "click", target: "Submit application" }),
    );
    expect(out).toEqual(["Applying as", "I confirm the information given is accurate"]);
  });

  it("leaves alone what the plan already covers, so repair never duplicates work", () => {
    expect(
      unaddressedRequired(["Email address"], pending({ kind: "fill", field: "Email", value: "ada@example.com" })),
    ).toEqual([]);
    expect(
      unaddressedRequired(["Name"], pending({ kind: "fill", field: "Full name", value: "Ada" })),
    ).toEqual([]);
  });

  it("matches a dropdown covered by a select step", () => {
    expect(unaddressedRequired(["Applying as"], pending({ kind: "select", field: "Applying as", value: "Independent researcher" }))).toEqual([]);
  });

  it("is quiet when the page reports nothing outstanding", () => {
    expect(unaddressedRequired([], pending({ kind: "click", target: "Submit" }))).toEqual([]);
  });

  it("ignores navigate and inspect steps, which fill nothing", () => {
    expect(unaddressedRequired(["Full name"], pending({ kind: "navigate", url: "https://example.com/" }, { kind: "inspect" }))).toEqual(["Full name"]);
  });
});

describe("recovery bounds", () => {
  it("stops repeating an action that changed nothing", () => {
    const d = decide({ attempts: 2, worldChangedSinceLastAttempt: false, stepsSinceProgress: 1, totalSteps: 3, alreadyEscalated: false, hasKnownNextAction: false, humanAvailable: false });
    expect(d.kind).not.toBe("retry");
  });

  it("does not escalate a stall while the page has told us exactly what is still needed", () => {
    const d = decide({ attempts: 0, worldChangedSinceLastAttempt: true, stepsSinceProgress: 20, totalSteps: 20, alreadyEscalated: false, hasKnownNextAction: true, humanAvailable: false });
    expect(d.kind).not.toBe("escalate");
  });
});

describe("work the page reports as already done", () => {
  const obs = (formState: string[]) => ({
    ok: true, failure: null, detail: "", pageText: "", url: "", outstandingRequired: [], formState, identifiers: [],
  });

  it("recognises a checkbox that is already ticked", () => {
    expect(alreadySatisfied({ kind: "click", target: "I confirm the information" }, obs(["I confirm the information given is accurate = checked"]))).toBe(true);
  });

  it("does not treat an unticked box as done", () => {
    expect(alreadySatisfied({ kind: "click", target: "I confirm the information" }, obs(["I confirm the information given is accurate = not checked"]))).toBe(false);
  });

  it("recognises a dropdown already holding the intended value", () => {
    expect(alreadySatisfied({ kind: "select", field: "Applying as", value: "Independent researcher" }, obs(["Applying as = Independent researcher"]))).toBe(true);
  });

  it("does NOT skip a control holding a different value — the step may exist to change it", () => {
    expect(alreadySatisfied({ kind: "select", field: "Applying as", value: "University" }, obs(["Applying as = Independent researcher"]))).toBe(false);
    expect(alreadySatisfied({ kind: "fill", field: "Full name", value: "Grace Hopper" }, obs(["Full name = Ada Lovelace"]))).toBe(false);
  });

  it("says no when the page reports nothing about that control", () => {
    expect(alreadySatisfied({ kind: "click", target: "Submit application" }, obs(["Full name = Ada Lovelace"]))).toBe(false);
    expect(alreadySatisfied({ kind: "fill", field: "Full name", value: "Ada Lovelace" }, null)).toBe(false);
  });

  it("never short-circuits navigation or inspection", () => {
    expect(alreadySatisfied({ kind: "navigate", url: "https://example.com/" }, obs(["Full name = Ada Lovelace"]))).toBe(false);
    expect(alreadySatisfied({ kind: "inspect" }, obs(["Full name = Ada Lovelace"]))).toBe(false);
  });
});

describe("completion is a property, not a happy path", () => {
  const ALL: StepStatus[] = ["pending", "attempted", "proven", "failed", "skipped", "blocked"];
  const s = (status: StepStatus, id: string) => step({ id, status });

  it("NO combination containing a non-proven step can ever report complete", () => {
    // Exhaustive rather than illustrative. An example test passes for the case someone thought of;
    // this one passes for every case, INCLUDING statuses added later — a new status is unproven by
    // default, so widening the union cannot quietly widen what counts as success.
    for (const a of ALL) {
      for (const b of ALL) {
        const state = withSteps([s(a, "1"), s(b, "2")]);
        const outcome = terminalStatus(state);
        if (a === "proven" && b === "proven") {
          expect(outcome, "all-proven must be complete").toBe("complete");
        } else {
          expect(outcome, `[${a}, ${b}] reported complete without every step proven`).not.toBe("complete");
        }
      }
    }
  });

  it("a single unproven step among many defeats completion", () => {
    for (const bad of ALL.filter((x) => x !== "proven")) {
      const state = withSteps([...Array.from({ length: 9 }, (_, i) => s("proven", `p${i}`)), s(bad, "x")]);
      expect(terminalStatus(state), `9 proven + one ${bad} must not be complete`).not.toBe("complete");
    }
  });

  it("an empty mission is blocked, never complete — nothing proven is not everything proven", () => {
    // `every` on an empty array is true, which is exactly how a vacuous truth becomes a false
    // success claim. Guarded explicitly.
    expect(terminalStatus(withSteps([]))).toBe("blocked");
  });
});

describe("work that never happened is reported as such", () => {
  it("blocked is a different fact from failed, and neither is progress", () => {
    const state = withSteps([step({ id: "a", status: "blocked" }), step({ id: "b", status: "failed" })]);
    expect(provenCount(state)).toBe(0);
    expect(unattemptedCount(state)).toBe(1); // blocked counts; failed was genuinely attempted
    expect(terminalStatus(state)).toBe("blocked");
  });

  it("one proven step among nine never attempted is not dressed up as partial progress", () => {
    // Technically "partial" is true here, and materially it misleads: the number is right and the
    // impression is wrong. Most of the work never happened, so say so.
    const state = withSteps([step({ id: "p", status: "proven" }), ...Array.from({ length: 9 }, (_, i) => step({ id: `s${i}`, status: "skipped" }))]);
    expect(terminalStatus(state)).toBe("blocked");
  });

  it("genuine partial work still reports partial", () => {
    const state = withSteps([
      step({ id: "a", status: "proven" }), step({ id: "b", status: "proven" }),
      step({ id: "c", status: "proven" }), step({ id: "d", status: "failed" }),
    ]);
    expect(terminalStatus(state)).toBe("partial");
  });
});

describe("a failure knows whether trying again is meaningful", () => {
  it("a control that does not exist will not exist on the second attempt", () => {
    expect(classifyFailure("not_found").retryable).toBe(false);
    expect(classifyFailure("policy_refused").retryable).toBe(false);
    expect(classifyFailure("missing_input").retryable).toBe(false);
  });

  it("transport and timing problems can clear", () => {
    expect(classifyFailure("transport").retryable).toBe(true);
    expect(classifyFailure("navigation_failed").retryable).toBe(true);
  });

  it("carries the detail for a human without letting control flow parse it", () => {
    const f = classifyFailure("not_found", 'no field matching "Affiliation"');
    expect(f.detail).toContain("Affiliation");
    expect(f.class).toBe("not_found");
  });
});
