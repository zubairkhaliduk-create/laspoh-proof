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
]);
export type StepStatus = z.infer<typeof StepStatus>;

export const StepSchema = z.object({
  id: z.string(),
  intent: z.string(),
  action: z.custom<Action>(),
  status: StepStatus.default("pending"),
  attempts: z.number().int().nonnegative().default(0),
  lastObservation: z.custom<Observation>().nullable().default(null),
  /** Why it is not `proven`, in the system's own words. Never blank when status is failed/skipped. */
  reason: z.string().default(""),
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

/**
 * The honest terminal status. `complete` requires EVERY step proven — a partial result is
 * `partial` with the real number, never a green tick over an incomplete run. `blocked` is for a
 * mission that cannot proceed at all, which is a different fact from having done some of the work.
 */
export function terminalStatus(s: MissionState): MissionStatus {
  const proven = provenCount(s);
  if (s.steps.length > 0 && proven === s.steps.length) return "complete";
  if (proven > 0) return "partial";
  return "blocked";
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
