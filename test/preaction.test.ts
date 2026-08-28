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

// FOUND BY THE LIVE EVALUATION, not by imagination: "Click Apply to open the application form"
// contains "apply" and commits nothing. The gate blocked it, so the agent never reached a form
// and every jobs mission proved zero. Over-blocking is not caution — it is a broken gate that
// would have shipped looking safe while proving nothing.
describe("navigational intent defeats the irreversible verb", () => {
  // The TARGET is a non-commit control, so these are plainly navigation.
  it.each([
    "Open the Backend Engineer role",
    "Go to the posting to read the employer note",
    "View the role and inspect the form",
    "Return to the job board",
  ])("%s is not irreversible", (intent) => {
    expect(isIrreversibleStep({ intent, action: { kind: "click", target: "View Backend Engineer role" } })).toBe(false);
  });

  // A control LABELLED "Apply" is a different matter, and the honest answer is that we cannot
  // tell from a label whether it opens a form or submits one — on plenty of real sites it
  // submits. So it arms the gate. That costs one verification round-trip on a compliant page
  // (the verifier reads the employer note and licenses it) and prevents an unrecallable action
  // on a page we should not have been on. Erring the other way is what "sent is sent" means.
  it("an Apply-labelled control arms the gate — a label cannot prove what a button does", () => {
    expect(isIrreversibleStep({ intent: "Click the Apply button to open the application form", action: { kind: "click", target: "Apply" } })).toBe(true);
  });

  it("but a real commit still is, even when the target word is mild", () => {
    expect(isIrreversibleStep({ intent: "Submit the application and record the reference", action: { kind: "click", target: "Submit application" } })).toBe(true);
    expect(isIrreversibleStep({ intent: "Send the message to the employer", action: { kind: "click", target: "Send" } })).toBe(true);
  });
});

// RECONNAISSANCE BEFORE PLANNING — the live evaluation caught the planner naming two roles that
// were not on the board at all ("Software Engineer", "Product Manager"), because it planned from
// the goal and a URL alone. A plan written against an imagined page is not a plan. The mission
// now navigates and observes FIRST, and hands the planner what the page really says.
describe("the planner sees the start page before it plans", () => {
  beforeEach(() => {
    vi.mocked(planFlow).mockReset();
    vi.mocked(verifyFlow).mockReset();
  });

  it("navigates first, then passes the observed text into the plan", async () => {
    const execute = vi.fn(async () => ({ ok: true, url: "http://localhost:1/demo/jobs", title: "board", pageText: "Backend Engineer — Orbital Systems Ltd", excerpt: "Backend Engineer — Orbital Systems Ltd", identifiers: [], formState: [], outstandingRequired: [] }));
    const executor = { name: "spy", preExisting: false, execute } as unknown as Executor;
    vi.mocked(planFlow).mockResolvedValue({ steps: [] } as never);
    vi.mocked(verifyFlow).mockResolvedValue({ verdict: "unproven", citedEvidence: [], reasoning: "" } as never);
    await runMission({ goal: "Apply to roles. Never recruitment agencies.", startUrl: "http://localhost:1/demo/jobs", executor, maxSteps: 3, missionId: "m_recon1" });
    // The FIRST thing the mission did was look.
    const firstAction = execute.mock.calls[0]?.[0] as { kind: string } | undefined;
    expect(firstAction?.kind).toBe("navigate");
    const planArgs = vi.mocked(planFlow).mock.calls[0]?.[0] as { startPageText?: string } | undefined;
    expect(planArgs?.startPageText).toContain("Orbital Systems");
  });

  it("a failed reconnaissance is not fatal — the planner falls back to goal-only", async () => {
    const execute = vi.fn(async () => ({ ok: false, failure: "transport", detail: "dns", url: "", title: "", excerpt: "", identifiers: [], formState: [], outstandingRequired: [] }));
    const executor = { name: "spy", preExisting: false, execute } as unknown as Executor;
    vi.mocked(planFlow).mockResolvedValue({ steps: [] } as never);
    await runMission({ goal: "Apply to roles. Never recruitment agencies.", startUrl: "http://localhost:1/x", executor, maxSteps: 3, missionId: "m_recon2" });
    const planArgs = vi.mocked(planFlow).mock.calls[0]?.[0] as { startPageText?: string } | undefined;
    expect(planArgs?.startPageText).toBeUndefined();
  });
});

// FOUND BY AN ADVERSARIAL SECURITY REVIEW. The first navigational rescue matched anywhere in the
// intent, so "Submit the application and read the reference" disarmed the gate — and the planner's
// own prompt encourages that phrasing, because it asks what will be VISIBLE afterwards. The
// central safety claim was one ordinary word from switching itself off.
describe("a commit verb cannot be disarmed by a later navigational word", () => {
  it.each([
    "Submit the application and read the reference shown",
    "Submit the application to see the confirmation",
    "Find the confirmation reference by submitting the application",
    "Send the message and view the sent confirmation",
    "Confirm the booking then read the reference",
  ])("%s IS irreversible", (intent) => {
    expect(isIrreversibleStep({ intent, action: { kind: "click", target: "Submit application" } })).toBe(true);
  });

  it("genuine navigation is still not irreversible — the over-blocking fix survives", () => {
    for (const [intent, target] of [
      ["Open the Backend Engineer role", "View Backend Engineer role"],
      ["Go to the posting to read the employer note", "View role"],
    ] as const) {
      expect(isIrreversibleStep({ intent, action: { kind: "click", target } })).toBe(false);
    }
  });

  it("a commit CONTROL arms the gate whatever the intent calls it", () => {
    expect(isIrreversibleStep({ intent: "Open the next page", action: { kind: "click", target: "Submit application" } })).toBe(true);
  });
});
