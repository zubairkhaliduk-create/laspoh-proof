/**
 * HOSTILE PLANS, CONSTRUCTED DIRECTLY.
 *
 * These are built by hand rather than harvested from a live model, deliberately. A live model
 * produces bad plans unpredictably; a suite needs them on demand. Every case here is ordinary
 * model behaviour, not an exotic edge — padding, repetition, and proof criteria that restate the
 * action are what models do when a prompt asks for a plan.
 */
import { describe, expect, it } from "vitest";
import { ensureNavigatesFirst, isSelfCertifyingCriterion, sanitizePlan, type PlanStep } from "../src/core/plan-sanitize.js";
import type { Action } from "../src/executors/types.js";

const step = (intent: string, action: Action, provenBy: string): PlanStep => ({ intent, action, provenBy });
const click = (target: string): Action => ({ kind: "click", target });
const fill = (field: string, value: string): Action => ({ kind: "fill", field, value });

describe("a proof criterion must name an outcome, not the action", () => {
  it("rejects a criterion that only restates the action", () => {
    // This is the dangerous one. provenBy exists so success cannot be redefined after the fact —
    // a criterion like this hands that redefinition straight back, and the verifier then answers
    // the wrong question CORRECTLY. Self-certification laundered through an independent component.
    expect(isSelfCertifyingCriterion("the button was clicked")).toBe(true);
    expect(isSelfCertifyingCriterion("The form was submitted")).toBe(true);
    expect(isSelfCertifyingCriterion("field filled")).toBe(true);
    expect(isSelfCertifyingCriterion("clicked")).toBe(true);
  });

  it("rejects a criterion too short to describe anything observable", () => {
    expect(isSelfCertifyingCriterion("")).toBe(true);
    expect(isSelfCertifyingCriterion("done")).toBe(true);
    expect(isSelfCertifyingCriterion("   ")).toBe(true);
  });

  it("keeps a criterion that mentions the action AND names what the page must show", () => {
    // Over-strictness would be its own failure: most real criteria mention the action in passing.
    expect(isSelfCertifyingCriterion("the form was submitted and a confirmation reference appears")).toBe(false);
    expect(isSelfCertifyingCriterion("clicked Submit, after which the dialog closes and a receipt is shown")).toBe(false);
  });

  it("keeps an ordinary outcome criterion", () => {
    expect(isSelfCertifyingCriterion("A confirmation reference beginning GR- is visible on the page")).toBe(false);
    expect(isSelfCertifyingCriterion("The Full name field shows Ada Lovelace")).toBe(false);
  });
});

describe("sanitizing a plan", () => {
  it("drops a self-certifying step and says exactly why", () => {
    const out = sanitizePlan([
      step("Fill the name", fill("Full name", "Ada"), "The Full name field shows Ada"),
      step("Submit", click("Submit"), "the button was clicked"),
    ]);
    expect(out.steps).toHaveLength(1);
    expect(out.dropped).toHaveLength(1);
    expect(out.dropped[0]!.why).toContain("restates the action");
  });

  it("deduplicates identical work — repetition is not a plan", () => {
    const out = sanitizePlan([
      step("Click next", click("Next"), "the next page of results is shown"),
      step("Click next again", click("Next"), "the next page of results is shown"),
    ]);
    expect(out.steps).toHaveLength(1);
    expect(out.dropped[0]!.why).toContain("repetition is not a plan");
  });

  it("does not confuse different values for the same field", () => {
    const out = sanitizePlan([
      step("First name", fill("Name", "Ada"), "the Name field shows Ada"),
      step("Correct it", fill("Name", "Grace"), "the Name field shows Grace"),
    ]);
    expect(out.steps).toHaveLength(2);
  });

  it("clamps to the budget and reports the excess rather than truncating silently", () => {
    const many = Array.from({ length: 40 }, (_, i) => step(`s${i}`, click(`Btn ${i}`), `control ${i} shows a result`));
    const out = sanitizePlan(many, { maxSteps: 5 });
    expect(out.steps).toHaveLength(5);
    expect(out.dropped).toHaveLength(35);
    expect(out.dropped[0]!.why).toContain("step budget");
  });

  it("drops a step with no stated intent — an unauditable step is not a step", () => {
    const out = sanitizePlan([step("", click("Go"), "the results page is displayed")]);
    expect(out.steps).toHaveLength(0);
    expect(out.dropped[0]!.why).toContain("cannot be audited");
  });

  it("returns an empty plan rather than inventing one when everything is dropped", () => {
    // The mission then reports blocked through the ordinary path. Silence here would be a plan
    // that looks fine and does nothing.
    const out = sanitizePlan([step("Submit", click("Submit"), "clicked")]);
    expect(out.steps).toHaveLength(0);
    expect(out.dropped).toHaveLength(1);
  });

  it("leaves a legitimate plan completely untouched", () => {
    const good = [
      step("Open the form", { kind: "navigate", url: "https://example.com/f" }, "the application form is displayed"),
      step("Fill the name", fill("Full name", "Ada"), "the Full name field shows Ada"),
      step("Submit", click("Submit application"), "a confirmation reference appears"),
    ];
    const out = sanitizePlan(good);
    expect(out.steps).toEqual(good);
    expect(out.dropped).toHaveLength(0);
  });
});

/**
 * MEASURED FAILURE, FIXED IN CODE.
 *
 * Across production runs roughly one in five proved nothing, and the signature was always
 * identical: a plan of about five steps, none proven. The cause was a missing first line — the
 * plan did not navigate, so every step searched `about:blank`, found nothing, and the mission
 * reported blocked.
 *
 * The planner is ASKED to navigate first and mostly complies. "Mostly" is not a guarantee, and
 * this project's whole argument is that the fix for that is to stop asking.
 */
describe("the mission starts where the mission is", () => {
  const nav = (url: string): PlanStep => step("go", { kind: "navigate", url }, "the page is displayed");

  it("inserts the navigation when the plan forgot it — the measured failure", () => {
    const out = sanitizePlan([step("Fill the name", fill("Full name", "Ada"), "the Full name field shows Ada")], {
      startUrl: "https://grants.example.org/demo",
    });
    expect(out.steps[0]!.action).toEqual({ kind: "navigate", url: "https://grants.example.org/demo" });
    expect(out.steps).toHaveLength(2);
  });

  it("leaves a plan that already navigates completely alone", () => {
    const good = [nav("https://grants.example.org/demo"), step("Fill", fill("Name", "Ada"), "the Name field shows Ada")];
    expect(sanitizePlan(good, { startUrl: "https://grants.example.org/demo" }).steps).toHaveLength(2);
  });

  it("does not duplicate when the plan navigates later instead of first", () => {
    // The inserted step and the plan's own are the same action, so deduplication removes one —
    // which is why the insertion runs before the dedupe rather than after.
    const out = sanitizePlan(
      [step("Fill", fill("Name", "Ada"), "the Name field shows Ada"), nav("https://grants.example.org/demo")],
      { startUrl: "https://grants.example.org/demo" },
    );
    expect(out.steps.filter((s) => s.action.kind === "navigate")).toHaveLength(1);
    expect(out.steps[0]!.action.kind, "the navigation must come FIRST, not merely exist").toBe("navigate");
  });

  it("inserts when the plan navigates somewhere else entirely", () => {
    const out = sanitizePlan([nav("https://elsewhere.example.com/")], { startUrl: "https://grants.example.org/demo" });
    expect((out.steps[0]!.action as { url: string }).url).toBe("https://grants.example.org/demo");
  });

  it("its own proof criterion is not self-certifying", () => {
    // The inserted step has to survive the very check this module applies to everything else —
    // "navigated successfully" would restate the action and be dropped, leaving the mission with
    // no navigation at all and the bug reintroduced by the fix for it.
    const out = sanitizePlan([step("Fill", fill("Name", "Ada"), "the Name field shows Ada")], {
      startUrl: "https://grants.example.org/demo",
    });
    expect(out.steps[0]!.action.kind).toBe("navigate");
    expect(out.dropped).toHaveLength(0);
  });

  it("does nothing when the mission has no starting URL", () => {
    const out = sanitizePlan([step("Fill", fill("Name", "Ada"), "the Name field shows Ada")]);
    expect(out.steps).toHaveLength(1);
  });

  it("survives a malformed startUrl rather than taking the mission down", () => {
    const out = sanitizePlan([step("Fill", fill("Name", "Ada"), "the Name field shows Ada")], { startUrl: "not a url" });
    expect(out.steps).toHaveLength(1);
  });
});
