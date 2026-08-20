/**
 * THE MISSION ORCHESTRATOR — plan, act, gather, verify, recover, report.
 *
 * This is the only component that sees the whole mission, and it is deliberately the only one
 * allowed to change state. The planner proposes, the executor acts, the verifier judges; none of
 * them can promote a step to `proven` on their own. That authority lives here, and it is exercised
 * on exactly one input: an independent verdict backed by cited evidence.
 *
 * The loop's shape is the argument of the whole project:
 *
 *     intent → action → OBSERVED result → evidence → independent verdict → state
 *
 * Note what is missing: at no point does the component that performed the work get a vote on
 * whether it worked.
 */
import { randomUUID } from "node:crypto";
import type { Executor } from "../executors/types.js";
import { type Evidence, recordEvidence } from "./evidence.js";
import { decide } from "./recovery.js";
import { buildReceipt, type Receipt } from "./receipt.js";
import { type MissionState, newMission, noteStep, provenCount, terminalStatus } from "./state.js";
import { planFlow } from "../flows/plan.js";
import { verifyFlow } from "../flows/verify.js";
import { modelIdentity } from "../genkit.js";

export interface RunOptions {
  goal: string;
  startUrl?: string;
  executor: Executor;
  /** Hard ceiling on dispatched actions. A budget the agent cannot argue with. */
  maxSteps?: number;
  onEvent?: (e: { type: string; [k: string]: unknown }) => void;
}

export interface RunResult {
  state: MissionState;
  receipt: Receipt;
  evidence: Evidence[];
}

export async function runMission(opts: RunOptions): Promise<RunResult> {
  const { goal, startUrl, executor, maxSteps = 24 } = opts;
  const emit = opts.onEvent ?? (() => {});
  const missionId = `m_${randomUUID().slice(0, 8)}`;

  let state = newMission(missionId, goal, executor.name);
  const evidence: Evidence[] = [];
  const verdicts = new Map<string, { verdict: string; citedEvidence: string[]; reasoning: string }>();
  const criteria = new Map<string, string>();

  emit({ type: "mission.start", missionId, goal, executor: executor.name });

  // ── PLAN ─────────────────────────────────────────────────────────────────────────────────
  const plan = await planFlow({ goal, startUrl });
  state = {
    ...state,
    status: "running",
    steps: plan.steps.map((s, i) => {
      const id = `s${i + 1}`;
      criteria.set(id, s.provenBy);
      return { id, intent: s.intent, action: s.action, status: "pending" as const, attempts: 0, lastObservation: null, reason: "" };
    }),
  };
  emit({ type: "plan.ready", understanding: plan.understanding, steps: state.steps.map((s) => ({ id: s.id, intent: s.intent, provenBy: criteria.get(s.id) })) });

  // ── ACT → OBSERVE → VERIFY ───────────────────────────────────────────────────────────────
  let dispatched = 0;
  for (const step of state.steps) {
    if (dispatched >= maxSteps) {
      state = { ...state, steps: state.steps.map((s) => (s.status === "pending" ? { ...s, status: "skipped", reason: "step budget reached before this step was attempted" } : s)) };
      emit({ type: "budget.exhausted", maxSteps });
      break;
    }

    const provenBefore = provenCount(state);
    let worldChanged = false;

    // The recovery policy decides whether we may dispatch at all — in code, not by asking the model.
    const lastObs = state.steps.find((s) => s.id === step.id)?.lastObservation ?? null;
    const known = (lastObs?.outstandingRequired ?? []).length > 0;
    const intervention = decide({
      attempts: step.attempts,
      worldChangedSinceLastAttempt: worldChanged,
      stepsSinceProgress: state.stepsSinceProgress,
      totalSteps: dispatched,
      alreadyEscalated: state.escalated,
      hasKnownNextAction: known,
      humanAvailable: false,
    });
    if (intervention.kind === "escalate" || intervention.kind === "ask_human") {
      state = { ...state, escalated: true };
      emit({ type: "recovery.escalate", why: intervention.why });
      state = { ...state, steps: state.steps.map((s) => (s.id === step.id ? { ...s, status: "skipped", reason: intervention.why } : s)) };
      continue;
    }

    emit({ type: "step.start", id: step.id, intent: step.intent, action: step.action });
    const obs = await executor.execute(step.action);
    dispatched += 1;
    worldChanged = obs.ok;

    const ev = recordEvidence(step.id, step.action, obs);
    evidence.push(ev);
    state = {
      ...state,
      evidenceIds: [...state.evidenceIds, ev.id],
      steps: state.steps.map((s) => (s.id === step.id ? { ...s, attempts: s.attempts + 1, lastObservation: obs, status: obs.ok ? "attempted" : "failed", reason: obs.ok ? "" : `${obs.failure ?? "unknown"}: ${obs.detail}` } : s)),
    };
    emit({ type: "step.observed", id: step.id, ok: obs.ok, failure: obs.failure, detail: obs.detail, outstandingRequired: obs.outstandingRequired });

    // INDEPENDENT VERIFICATION — the only path to `proven`.
    if (obs.ok) {
      const criterion = criteria.get(step.id) ?? step.intent;
      const relevant = evidence.filter((e) => e.stepId === step.id);
      const v = await verifyFlow({ criterion, evidence: relevant });
      verdicts.set(step.id, v);
      state = {
        ...state,
        steps: state.steps.map((s) =>
          s.id === step.id
            ? { ...s, status: v.verdict === "proven" ? "proven" : v.verdict === "contradicted" ? "failed" : "attempted", reason: v.verdict === "proven" ? "" : v.reasoning }
            : s,
        ),
      };
      emit({ type: "step.verdict", id: step.id, verdict: v.verdict, reasoning: v.reasoning, cited: v.citedEvidence });
    }

    state = noteStep(state, provenBefore);
  }

  // ── REPORT ───────────────────────────────────────────────────────────────────────────────
  state = { ...state, status: terminalStatus(state) };
  const receipt = buildReceipt({
    state,
    evidence,
    verdicts,
    executor: { name: executor.name, preExisting: executor.preExisting },
    model: modelIdentity() as unknown as Record<string, string>,
  });
  emit({ type: "mission.done", outcome: receipt.outcome, headline: receipt.headline });
  return { state, receipt, evidence };
}
