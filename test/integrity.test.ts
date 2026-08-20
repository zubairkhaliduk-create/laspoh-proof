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
import { newMission, noteStep, provenCount, terminalStatus, type MissionState, type Step } from "../src/core/state.js";
import { decide } from "../src/core/recovery.js";
import type { Action } from "../src/executors/types.js";

const step = (over: Partial<Step> & { id: string }): Step => ({
  intent: "", action: { kind: "inspect" }, status: "pending", attempts: 0, lastObservation: null, reason: "", ...over,
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
