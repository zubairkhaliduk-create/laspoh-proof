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
import { type MissionState, provenCount, attemptedCount, terminalStatus, unattemptedCount } from "./state.js";

export interface ReceiptLine {
  intent: string;
  status: string;
  reason: string;
  citedEvidence: string[];
  /** Present when the step failed. Carries whether another attempt was even meaningful, so a
   *  reader can tell "this could not work" from "this did not work this time". */
  failure?: { class: string; retryable: boolean } | null;
}

/** A step the plan proposed and the sanitiser removed BEFORE execution, with the reason.
 *  On the receipt because a plan silently shortened is a plan nobody can audit — and the most
 *  common removal is a proof criterion that restated the action, which is worth a reader seeing. */
export interface DroppedLine {
  intent: string;
  why: string;
}

export interface Receipt {
  missionId: string;
  goal: string;
  outcome: ReturnType<typeof terminalStatus>;
  /** The honest headline. proven/total — never "done". */
  headline: string;
  proven: number;
  attemptedNotProven: number;
  /** Attempted and provably did not achieve its intent. */
  failed: number;
  /** Never attempted — skipped deliberately, or blocked. Kept separate from `failed`, because
   *  "we tried and it did not work" and "we never got to it" are different facts and a reader
   *  deserves both. */
  unattempted: number;
  total: number;
  lines: ReceiptLine[];
  /** Steps removed before execution. Empty on a clean plan. */
  dropped: DroppedLine[];
  executor: { name: string; preExisting: boolean };
  model: Record<string, string>;
  evidenceCount: number;
  /** True when ANY evidence on this receipt was gathered through a disclosed pre-existing runtime.
   *  Structural disclosure: it travels with the result rather than living in a README. */
  usedPreExistingExecutor: boolean;
  startedAt: string;
  durationMs: number;
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
  dropped?: DroppedLine[];
}): Receipt {
  const { state, evidence, verdicts, executor, model } = args;
  const proven = provenCount(state);
  const outcome = terminalStatus(state);
  const failed = state.steps.filter((x) => x.status === "failed").length;
  const unattempted = unattemptedCount(state);
  const started = Date.parse(state.startedAt);
  const integrity = createHash("sha256").update(evidence.map((e) => e.sha256).join("|")).digest("hex");

  return {
    missionId: state.id,
    goal: state.goal,
    outcome,
    // The headline has one job: make the shortfall impossible to miss. Each branch states the
    // proven number AND what stands against it, because a number alone is where an honest report
    // quietly becomes a flattering one.
    headline: (() => {
      const M = state.steps.length;
      if (M === 0) return "Nothing was attempted — no executable plan was produced.";
      if (outcome === "complete") return `Proven ${proven} of ${M}.`;
      if (proven === 0) return `Nothing could be proven. ${M} step(s) attempted.`;
      if (unattempted > 0) return `Proven ${proven} of ${M}. ${unattempted} step(s) were never attempted.`;
      return `Proven ${proven} of ${M}. The rest is reported unproven, not counted.`;
    })(),
    proven,
    attemptedNotProven: attemptedCount(state),
    failed,
    unattempted,
    total: state.steps.length,
    lines: state.steps.map((s) => ({
      intent: s.intent,
      status: s.status,
      reason: s.reason || verdicts.get(s.id)?.reasoning || "",
      citedEvidence: verdicts.get(s.id)?.citedEvidence ?? [],
      failure: s.failure ? { class: s.failure.class, retryable: s.failure.retryable } : null,
    })),
    dropped: args.dropped ?? [],
    executor,
    model,
    evidenceCount: evidence.length,
    usedPreExistingExecutor: executor.preExisting || evidence.some((e) => e.producedBy?.preExisting === true),
    startedAt: state.startedAt,
    durationMs: Number.isFinite(started) ? Math.max(0, Date.now() - started) : 0,
    integrity,
    issuedAt: new Date().toISOString(),
  };
}
