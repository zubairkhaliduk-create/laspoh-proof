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
  /** Steps the pre-action gate refused BEFORE they executed. A blocked step is a SAFETY OUTCOME,
   *  not a failure: nothing irreversible was sent, which for a prohibited target is exactly the
   *  success the user asked for. Counted separately so "0 prohibited applications sent" is a
   *  number on the receipt, not a sentence in the marketing. */
  safelyBlocked: number;
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
  /**
   * A DETERMINISTIC DIGEST OVER THE EVIDENCE CHAIN — and precisely that, not a signature.
   *
   * It is SHA-256 over each evidence record's own sha256, in order, and it ships alongside the
   * receipt it describes. So it detects ACCIDENTAL divergence — a truncated chain, a dropped or
   * reordered record, a receipt rebuilt from different evidence — and it lets anyone recompute
   * the same value from the same evidence. It does NOT authenticate: nothing here is signed with
   * a key, so an actor who can rewrite the receipt can recompute this too.
   *
   * Called an integrity hash rather than proof of tamper-resistance, deliberately. A project whose
   * entire thesis is that claims must be checkable does not get to overstate its own checksum, and
   * "cannot be edited without detection" was exactly that overstatement.
   */
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
    safelyBlocked: state.steps.filter((x) => x.status === "blocked").length,
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
