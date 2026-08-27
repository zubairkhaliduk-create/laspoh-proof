/**
 * THE PRE-ACTION PROOF GATE. "Sent is sent": post-hoc verification is an autopsy for an
 * irreversible action, so the license to act must be proven FIRST. These tests pin the gate's
 * entire authority — when it arms, how the verifier's three verdicts map onto the decision, and
 * (the one that matters) that a refused step NEVER reaches the executor.
 */
vi.mock("../src/flows/plan.js", () => ({ planFlow: vi.fn() }));
vi.mock("../src/flows/verify.js", () => ({ verifyFlow: vi.fn() }));
vi.mock("../src/flows/repair.js", () => ({ repairFlow: vi.fn(async () => ({ values: [] })) }));

import { describe, expect, it, vi, beforeEach } from "vitest";
import { decideFromVerdict, goalStatesConstraints, isIrreversibleStep, preactionCriterion } from "../src/core/preaction.js";
import { runMission } from "../src/core/orchestrator.js";
import { planFlow } from "../src/flows/plan.js";
import { verifyFlow } from "../src/flows/verify.js";
import type { Executor } from "../src/executors/types.js";

const GOAL = "Apply to the suitable direct-employer roles. Never recruitment agencies. Return proof for every application.";

describe("classification — pure, content-neutral", () => {
  it("a submit-class click is irreversible; matched on the step's own words, never a site", () => {
    for (const target of ["Submit application", "Apply now", "Send message", "Confirm and pay", "Place order", "Publish"]) {
      expect(isIrreversibleStep({ intent: "do it", action: { kind: "click", target } })).toBe(true);
    }
  });
  it("reading, navigating and filling commit nothing", () => {
    expect(isIrreversibleStep({ intent: "submit the form", action: { kind: "navigate" } as never })).toBe(false);
    expect(isIrreversibleStep({ intent: "fill the name", action: { kind: "fill", target: "name" } as never })).toBe(false);
    expect(isIrreversibleStep({ intent: "read the page", action: { kind: "read", target: "h1" } as never })).toBe(false);
  });
  it("an ordinary click is not irreversible — the gate must not tax honest browsing", () => {
    expect(isIrreversibleStep({ intent: "open the posting", action: { kind: "click", target: "Backend Engineer" } })).toBe(false);
  });
  it("constraint detection reads the user's own words", () => {
    expect(goalStatesConstraints(GOAL)).toBe(true);
    expect(goalStatesConstraints("Apply only to remote roles")).toBe(true);
    expect(goalStatesConstraints("Apply for the research grant and obtain the reference")).toBe(false);
  });
  it("the criterion quotes the goal verbatim — the gate can only enforce what the user said", () => {
    const c = preactionCriterion(GOAL, "Submit the application");
    expect(c).toContain(GOAL);
    expect(c).toContain("Submit the application");
  });
});

describe("verdict → decision mapping — the gate's whole authority", () => {
  it("proven complies → allow", () => {
    expect(decideFromVerdict({ verdict: "proven", reasoning: "page states direct employer" })).toMatchObject({ allow: true });
  });
  it("contradicted → blocked, violation, with the quote carried", () => {
    const d = decideFromVerdict({ verdict: "contradicted", reasoning: "the page says recruitment agency" });
    expect(d).toMatchObject({ allow: false, safely: false });
    expect((d as { reasoning: string }).reasoning).toContain("recruitment agency");
  });
  it("unproven → blocked SAFELY — no evidence, no irreversible action", () => {
    expect(decideFromVerdict({ verdict: "unproven" })).toMatchObject({ allow: false, safely: true });
  });
});

describe("the gate in the loop — a refused step never reaches the executor", () => {
  const execute = vi.fn(async () => ({ ok: true, url: "u", title: "t", excerpt: "Application submitted. Application reference: JA-000001", identifiers: ["JA-000001"], formState: [], outstandingRequired: [] }));
  const executor = { name: "spy", preExisting: false, execute } as unknown as Executor;

  beforeEach(() => {
    execute.mockClear();
    vi.mocked(planFlow).mockReset();
    vi.mocked(verifyFlow).mockReset();
  });

  it("BLOCKS an irreversible step when the verifier contradicts compliance — before dispatch", async () => {
    vi.mocked(planFlow).mockResolvedValue({ steps: [
      { intent: "open the posting", action: { kind: "navigate", url: "http://localhost:1/demo/jobs/role-b" }, provenBy: "the posting is visible" },
      { intent: "submit the application", action: { kind: "click", target: "Submit application" }, provenBy: "a reference is shown" },
    ] } as never);
    // First verify call = post-hoc for the navigate; the gate's call happens before the click.
    vi.mocked(verifyFlow).mockImplementation(async ({ criterion }: { criterion: string }) => {
      if (criterion.includes("PRE-ACTION GATE")) return { verdict: "contradicted", citedEvidence: ["TalentBridge Recruitment is a recruitment agency"], reasoning: "the page states this is a recruitment agency" } as never;
      return { verdict: "proven", citedEvidence: ["the posting is visible"], reasoning: "" } as never;
    });
    const { receipt } = await runMission({ goal: GOAL, executor, maxSteps: 5, missionId: "m_gatetest1" });
    // The submit click NEVER executed: only the navigate was dispatched.
    const dispatchedClicks = execute.mock.calls.filter((c) => (c[0] as { kind: string }).kind === "click");
    expect(dispatchedClicks).toHaveLength(0);
    expect(receipt.safelyBlocked).toBeGreaterThanOrEqual(1);
    const blocked = receipt.lines.find((l: { status: string }) => l.status === "blocked");
    expect(blocked?.reason).toContain("BEFORE it executed");
    expect(blocked?.reason).toContain("recruitment agency");
  });

  it("BLOCKS SAFELY when evidence is silent — silence is not permission for irreversible work", async () => {
    vi.mocked(planFlow).mockResolvedValue({ steps: [
      { intent: "open the posting", action: { kind: "navigate", url: "http://localhost:1/x" }, provenBy: "the posting page is shown with the employer note" },
      { intent: "submit the application", action: { kind: "click", target: "Submit application" }, provenBy: "a reference is shown" },
    ] } as never);
    vi.mocked(verifyFlow).mockImplementation(async ({ criterion }: { criterion: string }) =>
      criterion.includes("PRE-ACTION GATE")
        ? ({ verdict: "unproven", citedEvidence: [], reasoning: "the page does not say who the employer is" } as never)
        : ({ verdict: "proven", citedEvidence: ["visible"], reasoning: "" } as never));
    const { receipt } = await runMission({ goal: GOAL, executor, maxSteps: 5, missionId: "m_gatetest2" });
    expect(execute.mock.calls.filter((c) => (c[0] as { kind: string }).kind === "click")).toHaveLength(0);
    expect(receipt.lines.find((l: { status: string }) => l.status === "blocked")?.reason).toContain("no evidence, no irreversible action");
  });

  it("ALLOWS when compliance is proven — the gate is a license, not a veto on honest work", async () => {
    vi.mocked(planFlow).mockResolvedValue({ steps: [
      { intent: "open the posting", action: { kind: "navigate", url: "http://localhost:1/x" }, provenBy: "the posting page is shown with the employer note" },
      { intent: "submit the application", action: { kind: "click", target: "Submit application" }, provenBy: "a reference is shown" },
    ] } as never);
    vi.mocked(verifyFlow).mockImplementation(async ({ criterion }: { criterion: string }) =>
      criterion.includes("PRE-ACTION GATE")
        ? ({ verdict: "proven", citedEvidence: ["Orbital Systems Ltd is the hiring company"], reasoning: "direct employer stated" } as never)
        : ({ verdict: "proven", citedEvidence: ["Application reference: JA-000001"], reasoning: "" } as never));
    const { receipt } = await runMission({ goal: GOAL, executor, maxSteps: 5, missionId: "m_gatetest3" });
    expect(execute.mock.calls.some((c) => (c[0] as { kind: string }).kind === "click")).toBe(true);
    expect(receipt.safelyBlocked).toBe(0);
  });

  it("does NOT arm on a goal without constraints — the stable grant demo is untouched", async () => {
    vi.mocked(planFlow).mockResolvedValue({ steps: [
      { intent: "open the form", action: { kind: "navigate", url: "http://localhost:1/demo" }, provenBy: "the posting page is shown with the employer note" },
      { intent: "submit the application", action: { kind: "click", target: "Submit application" }, provenBy: "a reference is shown" },
    ] } as never);
    const gateCalls: string[] = [];
    vi.mocked(verifyFlow).mockImplementation(async ({ criterion }: { criterion: string }) => {
      gateCalls.push(criterion);
      return { verdict: "proven", citedEvidence: ["Application reference: JA-000001"], reasoning: "" } as never;
    });
    await runMission({ goal: "Apply for the research grant and obtain the confirmation reference.", executor, maxSteps: 5, missionId: "m_gatetest4" });
    expect(gateCalls.some((c) => c.includes("PRE-ACTION GATE"))).toBe(false);
  });
});
