/**
 * MISSION STATE — one place that knows where a mission really is.
 *
 * A long-running agent's hardest problem is not deciding what to do next; it is knowing what it
 * has already genuinely done. This module keeps that answer in ONE structure, so no other part of
 * the system has to reconstruct it from logs or model output. Two rules make it trustworthy:
 *
 *   1. A step's status only ever advances through evidence, never through intent. Dispatching an
 *      action moves nothing to `proven`.
 *   2. `provenCount` is the only number allowed to describe success. Anything else — steps
 *      attempted, actions dispatched, tokens spent — is activity, and activity is not progress.
 *
 * The whole state is a plain serialisable object so a checkpoint is just a snapshot: no ORM, no
 * hidden handles, nothing that cannot survive a process restart.
 */
import { z } from "zod";
import type { Action, Observation } from "../executors/types.js";

export const StepStatus = z.enum([
  "pending",   // planned, not attempted
  "attempted", // dispatched; effect observed but NOT independently confirmed
  "proven",    // an independent verifier confirmed it from evidence
  "failed",    // attempted, and provably did not achieve its intent
  "skipped",   // deliberately abandoned, with a reason
  // COULD NOT BE ATTEMPTED — which is a different fact from having tried and failed, and the
  // receipt should not blur them. A missing input, a policy refusal or an unavailable executor
  // means the work never happened; recording that as `failed` claims an attempt that was never
  // made, and leaves the reason string doing a job the type should do.
  "blocked",
]);
export type StepStatus = z.infer<typeof StepStatus>;

/**
 * WHY A FAILURE IS TYPED RATHER THAN PROSE.
 *
 * `reason` is for a human. Recovery needs to know one thing prose cannot reliably carry: is
 * another attempt meaningful at all? A transport blip and "there is no such control on this page"
 * both read as failures and deserve opposite treatment, and re-deriving that from a string is how
 * a recovery loop ends up retrying something that can never work.
 *
 * `retryable` is a FACT about the failure, not a decision. Whether to actually retry stays with
 * the recovery policy, which is the only component that knows what else has been tried.
 */
export const FailureSchema = z.object({
  class: z.enum([
    "not_found", "not_actionable", "no_effect", "value_discarded",
    "navigation_failed", "transport", "policy_refused", "missing_input",
  ]),
  detail: z.string().default(""),
  retryable: z.boolean(),
});
export type Failure = z.infer<typeof FailureSchema>;

/** Which failure classes are worth another attempt. Transport and timing problems can clear;
 *  a control that does not exist will not come into existence because we asked twice. */
export const RETRYABLE_FAILURES: ReadonlySet<Failure["class"]> = new Set(["transport", "no_effect", "navigation_failed"]);

export function classifyFailure(cls: Failure["class"], detail = ""): Failure {
  return { class: cls, detail, retryable: RETRYABLE_FAILURES.has(cls) };
}

export const StepSchema = z.object({
  id: z.string(),
  intent: z.string(),
  action: z.custom<Action>(),
  status: StepStatus.default("pending"),
  attempts: z.number().int().nonnegative().default(0),
  lastObservation: z.custom<Observation>().nullable().default(null),
  /** Why it is not `proven`, in the system's own words. Never blank when status is failed/skipped. */
  reason: z.string().default(""),
  /** The typed failure, when there is one. Carries retryability so recovery does not have to
   *  guess it from `reason`. */
  failure: FailureSchema.nullable().default(null),
});
export type Step = z.infer<typeof StepSchema>;

export const MissionStatus = z.enum(["planning", "running", "verifying", "complete", "partial", "blocked"]);
export type MissionStatus = z.infer<typeof MissionStatus>;

export const MissionStateSchema = z.object({
  id: z.string(),
  goal: z.string(),
  status: MissionStatus.default("planning"),
  steps: z.array(StepSchema).default([]),
  /** Evidence ids banked so far (see evidence.ts). Append-only within a mission. */
  evidenceIds: z.array(z.string()).default([]),
  /** Steps taken since provenCount last rose — the signal that survives page churn. */
  stepsSinceProgress: z.number().int().nonnegative().default(0),
  /** Set once a stall has been escalated, so the escalation fires once rather than every step. */
  escalated: z.boolean().default(false),
  executor: z.string().default(""),
  startedAt: z.string(),
  updatedAt: z.string(),
});
export type MissionState = z.infer<typeof MissionStateSchema>;

export function newMission(id: string, goal: string, executor: string): MissionState {
  const now = new Date().toISOString();
  return { id, goal, status: "planning", steps: [], evidenceIds: [], stepsSinceProgress: 0, escalated: false, executor, startedAt: now, updatedAt: now };
}

/** The ONLY number that may be reported as success. */
export function provenCount(s: MissionState): number {
  return s.steps.filter((x) => x.status === "proven").length;
}

/** Activity, kept deliberately separate from progress so the two can never be confused. */
export function attemptedCount(s: MissionState): number {
  return s.steps.filter((x) => x.status === "attempted").length;
}

/** Work that never happened, for either reason. Reported, because a mission that skipped most of
 *  its steps and proved one is not meaningfully "partial" in the way that word suggests. */
export function unattemptedCount(s: MissionState): number {
  return s.steps.filter((x) => x.status === "skipped" || x.status === "blocked").length;
}

/**
 * The honest terminal status. `complete` requires EVERY step proven — a partial result is
 * `partial` with the real number, never a green tick over an incomplete run. `blocked` is for a
 * mission that cannot proceed at all, which is a different fact from having done some of the work.
 */
export function terminalStatus(s: MissionState): MissionStatus {
  if (s.steps.length === 0) return "blocked";
  const proven = provenCount(s);
  // `complete` requires EVERY step proven. Written as "no step is unproven" rather than a count
  // comparison so that adding a status later cannot quietly widen what counts as success — a new
  // status is unproven by default, which is the safe direction.
  const allProven = s.steps.every((x) => x.status === "proven");
  if (allProven) return "complete";
  if (proven === 0) return "blocked";
  // Proven work exists, so this is genuinely partial — but if NOTHING was ever attempted beyond
  // what was proven, and the rest was skipped or blocked, say blocked instead of dressing it as
  // progress. A mission that proved one step and never tried the other nine is not "partial" in
  // any sense the reader would recognise.
  if (unattemptedCount(s) === s.steps.length - proven && proven * 2 < s.steps.length) return "blocked";
  return "partial";
}

/** Advance the no-progress counter. Cleared ONLY by proven work rising — page changes, dispatched
 *  actions and model confidence are all explicitly insufficient. */
export function noteStep(s: MissionState, provenBefore: number): MissionState {
  const provenNow = provenCount(s);
  const advanced = provenNow > provenBefore;
  return {
    ...s,
    stepsSinceProgress: advanced ? 0 : s.stepsSinceProgress + 1,
    escalated: advanced ? false : s.escalated,
    updatedAt: new Date().toISOString(),
  };
}
