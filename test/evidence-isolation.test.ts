/**
 * PRE-ACTION EVIDENCE MUST NOT GRADE THE POST-ACTION CRITERION.
 *
 * Found by an adversarial review, in the one path that matters most. The gate captures the page
 * BEFORE an irreversible click; outcome verification selects evidence by stepId. Filing the
 * gate's snapshot under the action's own id put the before-page into the corpus used to grade
 * "did the confirmation appear" — so a quote from before the submit could ground a proven verdict,
 * verbatim, and citation grounding would confirm it because the text really was on a page.
 */
vi.mock("../src/flows/plan.js", () => ({ planFlow: vi.fn() }));
vi.mock("../src/flows/verify.js", () => ({ verifyFlow: vi.fn() }));
vi.mock("../src/flows/repair.js", () => ({ repairFlow: vi.fn(async () => ({ values: [] })) }));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runMission } from "../src/core/orchestrator.js";
import { planFlow } from "../src/flows/plan.js";
import { verifyFlow } from "../src/flows/verify.js";
import type { Executor } from "../src/executors/types.js";

const GOAL = "Apply to direct employers. Never recruitment agencies.";

describe("the outcome verifier never sees the pre-action page", () => {
  beforeEach(() => { vi.mocked(planFlow).mockReset(); vi.mocked(verifyFlow).mockReset(); });

  it("grades the post-action criterion against post-action evidence only", async () => {
    // BEFORE the click the page shows the form. AFTER, it shows the reference.
    let clicked = false;
    const execute = vi.fn(async (a: { kind: string }) => {
      if (a.kind === "click") clicked = true;
      const text = clicked
        ? "Application submitted. Application reference: JA-424242"
        : "Orbital Systems Ltd is the hiring company. Submit application";
      return { ok: true, url: "http://localhost:1/role-a", title: "t", pageText: text, excerpt: text, identifiers: [], formState: [], outstandingRequired: [] };
    });
    const executor = { name: "spy", preExisting: false, execute } as unknown as Executor;

    vi.mocked(planFlow).mockResolvedValue({ steps: [
      { intent: "open the posting", action: { kind: "navigate", url: "http://localhost:1/role-a" }, provenBy: "the employer note is shown on the page" },
      { intent: "submit the application", action: { kind: "click", target: "Submit application" }, provenBy: "an application reference is shown" },
    ] } as never);

    const corpora: string[][] = [];
    vi.mocked(verifyFlow).mockImplementation(async ({ criterion, evidence }: { criterion: string; evidence: { excerpt: string }[] }) => {
      if (criterion.includes("PRE-ACTION GATE")) {
        return { verdict: "proven", citedEvidence: ["Orbital Systems Ltd is the hiring company"], reasoning: "direct employer" } as never;
      }
      // The goal-level verdict deliberately sees ALL evidence — it is answering the user's
      // question, not a step's. Only step corpora are collected here.
      if (!criterion.includes("THE USER'S GOAL, VERBATIM")) corpora.push(evidence.map((e) => e.excerpt));
      return { verdict: "proven", citedEvidence: ["Application reference: JA-424242"], reasoning: "" } as never;
    });

    await runMission({ goal: GOAL, startUrl: "http://localhost:1/role-a", executor, maxSteps: 6, missionId: "m_iso" });

    // The submit step's outcome corpus must contain the AFTER page and NOT the BEFORE page.
    const submitCorpus = corpora.at(-1) ?? [];
    expect(submitCorpus.join(" ")).toContain("JA-424242");
    expect(submitCorpus.join(" ")).not.toContain("Submit application");
  });
});
