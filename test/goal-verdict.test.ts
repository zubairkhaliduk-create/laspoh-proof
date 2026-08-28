/**
 * THE GOAL-LEVEL VERDICT — the answer to the user's question, not the planner's.
 *
 * An adversarial review put the central hole precisely: every step criterion is planner-authored,
 * and `complete` is just the AND of them, so a plan of easy steps with easy criteria produces a
 * clean receipt and a valid integrity hash while achieving nothing the user asked for. Nothing
 * anywhere compared the plan to the goal.
 *
 * The fix cannot be allowed to launder anything, so these tests pin BOTH directions: it makes
 * plan-level gaming visible, and it can never promote a mission that proved nothing.
 */
vi.mock("../src/flows/plan.js", () => ({ planFlow: vi.fn() }));
vi.mock("../src/flows/verify.js", () => ({ verifyFlow: vi.fn() }));
vi.mock("../src/flows/repair.js", () => ({ repairFlow: vi.fn(async () => ({ values: [] })) }));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runMission } from "../src/core/orchestrator.js";
import { planFlow } from "../src/flows/plan.js";
import { verifyFlow } from "../src/flows/verify.js";
import type { Executor } from "../src/executors/types.js";

const executor = {
  name: "spy", preExisting: false,
  execute: async () => ({ ok: true, url: "http://localhost:1/x", title: "t", pageText: "Fieldworks Job Board", excerpt: "Fieldworks Job Board", identifiers: [], formState: [], outstandingRequired: [] }),
} as unknown as Executor;

const easyPlan = { steps: [{ intent: "look at the board", action: { kind: "navigate", url: "http://localhost:1/x" }, provenBy: "the board heading is shown on the page" }] };

describe("the goal is judged separately from the plan", () => {
  beforeEach(() => { vi.mocked(planFlow).mockReset(); vi.mocked(verifyFlow).mockReset(); });

  it("every step proven, goal NOT established — the failure step verdicts cannot see", async () => {
    vi.mocked(planFlow).mockResolvedValue(easyPlan as never);
    vi.mocked(verifyFlow).mockImplementation(async ({ criterion }: { criterion: string }) =>
      criterion.includes("THE USER'S GOAL, VERBATIM")
        ? ({ verdict: "unproven", citedEvidence: [], reasoning: "no application was evidenced" } as never)
        : ({ verdict: "proven", citedEvidence: ["Fieldworks Job Board"], reasoning: "" } as never));

    const { receipt } = await runMission({ goal: "Apply to 4 roles and obtain a reference for each.", startUrl: "http://localhost:1/x", executor, maxSteps: 3, missionId: "m_goal1" });
    expect(receipt.proven).toBeGreaterThanOrEqual(1);         // the plan's own steps passed
    expect(receipt.goalAchieved?.verdict).toBe("unproven");   // and the goal did not
    expect(receipt.goalAchieved?.reasoning).toContain("no application");
  });

  it("the goal verdict is judged WITHOUT the plan, the criteria or any prior verdict", async () => {
    vi.mocked(planFlow).mockResolvedValue(easyPlan as never);
    let goalArgs: { criterion: string; evidence: unknown[] } | null = null;
    vi.mocked(verifyFlow).mockImplementation(async (a: { criterion: string; evidence: unknown[] }) => {
      if (a.criterion.includes("THE USER'S GOAL, VERBATIM")) goalArgs = a;
      return { verdict: "proven", citedEvidence: ["Fieldworks Job Board"], reasoning: "" } as never;
    });
    await runMission({ goal: "Apply to 4 roles.", startUrl: "http://localhost:1/x", executor, maxSteps: 3, missionId: "m_goal2" });
    expect(goalArgs).not.toBeNull();
    expect(goalArgs!.criterion).toContain("Apply to 4 roles.");
    expect(goalArgs!.criterion).not.toContain("look at the board");     // no plan
    expect(goalArgs!.criterion).toContain("Ignore any plan");
  });

  it("it can never promote: a mission that proved nothing is not rescued by a proven goal", async () => {
    vi.mocked(planFlow).mockResolvedValue(easyPlan as never);
    vi.mocked(verifyFlow).mockImplementation(async ({ criterion }: { criterion: string }) =>
      criterion.includes("THE USER'S GOAL, VERBATIM")
        ? ({ verdict: "proven", citedEvidence: ["Fieldworks Job Board"], reasoning: "looks fine to me" } as never)
        : ({ verdict: "unproven", citedEvidence: [], reasoning: "nothing shown" } as never));
    const { receipt } = await runMission({ goal: "Apply to 4 roles.", startUrl: "http://localhost:1/x", executor, maxSteps: 3, missionId: "m_goal3" });
    expect(receipt.proven).toBe(0);
    expect(receipt.outcome).not.toBe("complete");
  });

  it("a goal check that cannot run leaves every step-level truth untouched", async () => {
    vi.mocked(planFlow).mockResolvedValue(easyPlan as never);
    vi.mocked(verifyFlow).mockImplementation(async ({ criterion }: { criterion: string }) => {
      if (criterion.includes("THE USER'S GOAL, VERBATIM")) throw new Error("model down");
      return { verdict: "proven", citedEvidence: ["Fieldworks Job Board"], reasoning: "" } as never;
    });
    const { receipt } = await runMission({ goal: "Apply to 4 roles.", startUrl: "http://localhost:1/x", executor, maxSteps: 3, missionId: "m_goal4" });
    expect(receipt.goalAchieved).toBeNull();
    expect(receipt.proven).toBeGreaterThanOrEqual(1);
  });
});
