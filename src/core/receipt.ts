/**
 * THE RECEIPT — the deliverable.
 *
 * A receipt states what was PROVEN, what was merely attempted, and what failed, with the evidence
 * for each. It is deliberately capable of being unflattering: a mission that proved 3 of 5 says
 * exactly that, names the two it could not, and gives the reason. A report that can only describe
 * success is marketing, not evidence.
 */
import { createHash } from "node:crypto";
import type { Evidence } from "./evidence.js";
import { type MissionState, provenCount, attemptedCount, terminalStatus } from "./state.js";

export interface ReceiptLine {
  intent: string;
  status: string;
  reason: string;
  citedEvidence: string[];
}

export interface Receipt {
  missionId: string;
  goal: string;
  outcome: ReturnType<typeof terminalStatus>;
  /** The honest headline. proven/total — never "done". */
  headline: string;
  proven: number;
  attemptedNotProven: number;
  total: number;
  lines: ReceiptLine[];
  executor: { name: string; preExisting: boolean };
  model: Record<string, string>;
  evidenceCount: number;
  /** Hash over the evidence chain, so a receipt cannot be edited without detection. */
  integrity: string;
  issuedAt: string;
}

export function buildReceipt(args: {
  state: MissionState;
  evidence: Evidence[];
  verdicts: Map<string, { verdict: string; citedEvidence: string[]; reasoning: string }>;
  executor: { name: string; preExisting: boolean };
  model: Record<string, string>;
}): Receipt {
  const { state, evidence, verdicts, executor, model } = args;
  const proven = provenCount(state);
  const outcome = terminalStatus(state);
  const integrity = createHash("sha256").update(evidence.map((e) => e.sha256).join("|")).digest("hex");

  return {
    missionId: state.id,
    goal: state.goal,
    outcome,
    headline:
      outcome === "complete"
        ? `Proven ${proven} of ${state.steps.length}.`
        : outcome === "partial"
          ? `Proven ${proven} of ${state.steps.length}. The rest is reported unproven, not counted.`
          : `Nothing could be proven. ${state.steps.length} step(s) attempted.`,
    proven,
    attemptedNotProven: attemptedCount(state),
    total: state.steps.length,
    lines: state.steps.map((s) => ({
      intent: s.intent,
      status: s.status,
      reason: s.reason || verdicts.get(s.id)?.reasoning || "",
      citedEvidence: verdicts.get(s.id)?.citedEvidence ?? [],
    })),
    executor,
    model,
    evidenceCount: evidence.length,
    integrity,
    issuedAt: new Date().toISOString(),
  };
}
