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
import type { Action, Executor, Observation } from "../executors/types.js";
import { type Evidence, recordEvidence } from "./evidence.js";
import { decide } from "./recovery.js";
import { buildReceipt, type Receipt } from "./receipt.js";
import { classifyFailure, type MissionState, newMission, noteStep, provenCount, terminalStatus } from "./state.js";
import { planFlow } from "../flows/plan.js";
import { sanitizePlan } from "./plan-sanitize.js";
import { isNavigationAllowed } from "../security/untrusted.js";
import { repairFlow } from "../flows/repair.js";
import { verifyFlow } from "../flows/verify.js";
import { modelIdentity } from "../genkit.js";

export interface RunOptions {
  goal: string;
  startUrl?: string;
  /** Origins the mission may navigate to. Defaults to the origin of `startUrl` — a mission given a
   *  starting point has a natural boundary, and a page should not be able to walk the agent (and
   *  whatever it has read) somewhere else. Pass [] to disable the restriction deliberately. */
  allowedOrigins?: string[];
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

/** The origin of a URL, or "" if it cannot be parsed. Never throws — a bad startUrl should not
 *  take the mission down before it begins. */
function safeOrigin(url: string): string {
  try { return new URL(url).origin; } catch { return ""; }
}

/** Which control a step is aimed at, whatever verb it uses. */
function targetOf(a: Action): string {
  switch (a.kind) {
    case "fill":
    case "select":
      return a.field;
    case "click":
      return a.target;
    default:
      return "";
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * The required controls the page is reporting that NO remaining step would fill.
 *
 * This is the whole anti-blindness mechanism, and it is deliberately a pure function over two
 * facts: what the page says is outstanding, and what the plan still intends to do. Neither is a
 * model opinion. A field already covered by a pending step is left alone — repairing it would
 * duplicate work — so what survives this filter is exactly the set the agent would otherwise have
 * discovered the hard way, by submitting and being refused.
 */
export function unaddressedRequired(outstanding: string[], pending: { action: Action }[]): string[] {
  const targets = pending.map((s) => norm(targetOf(s.action))).filter((t) => t.length >= 3);
  return outstanding.filter((label) => {
    const l = norm(label);
    if (l.length < 3) return false;
    return !targets.some((t) => (t.length >= l.length ? t.includes(l) : l.includes(t)));
  });
}

/**
 * Does the page ALREADY satisfy what this step was going to do?
 *
 * Repair inserts steps for controls the plan overlooked, which can leave a later planned step
 * aiming at something now done. Dispatching it anyway is how an agent re-ticks a ticked box or
 * re-selects a set dropdown — and when the re-attempt reports no_effect, the step is recorded as a
 * FAILURE for work that was actually completed. That is a lie in the safe-looking direction, and
 * it is still a lie.
 *
 * Deliberately narrow: satisfied means the intended end state is what the page reports right now.
 * A control holding a DIFFERENT value is not satisfied — the step may exist precisely to change it.
 */
export function alreadySatisfied(action: Action, obs: Observation | null): boolean {
  if (!obs) return false;
  const target = norm(targetOf(action));
  if (target.length < 3) return false;
  const entry = (obs.formState ?? []).find((f) => {
    const label = norm(f.slice(0, f.lastIndexOf(" = ")));
    return label.length >= 3 && (label.length >= target.length ? label.includes(target) : target.includes(label));
  });
  if (!entry) return false;
  const value = entry.slice(entry.lastIndexOf(" = ") + 3).trim();
  if (action.kind === "click") return value === "checked";
  if (action.kind === "fill" || action.kind === "select") return norm(value) === norm(action.value);
  return false;
}

/** Repair is bounded. An agent allowed to repair indefinitely is an agent allowed to loop. */
const MAX_REPAIR_ROUNDS = 2;

export async function runMission(opts: RunOptions): Promise<RunResult> {
  const { goal, startUrl, executor, maxSteps = 24 } = opts;
  // The boundary is derived from the mission, not configured separately: the common case should be
  // safe without anyone remembering to make it so.
  const allowedOrigins = opts.allowedOrigins ?? (startUrl ? [safeOrigin(startUrl)].filter(Boolean) : []);
  const emit = opts.onEvent ?? (() => {});
  const missionId = `m_${randomUUID().slice(0, 8)}`;

  let state = newMission(missionId, goal, executor.name);
  const evidence: Evidence[] = [];
  const verdicts = new Map<string, { verdict: string; citedEvidence: string[]; reasoning: string }>();
  const criteria = new Map<string, string>();

  emit({ type: "mission.start", missionId, goal, executor: executor.name });

  // ── PLAN ─────────────────────────────────────────────────────────────────────────────────
  const rawPlan = await planFlow({ goal, startUrl });
  // A schema checks the plan's SHAPE. This checks that it is a plan: no repetition, no step whose
  // proof criterion merely restates the action it is meant to prove, nothing beyond the budget.
  // Everything removed is reported rather than swallowed — a plan silently shortened is a plan
  // nobody can audit.
  const sanitized = sanitizePlan(rawPlan.steps, { maxSteps, ...(startUrl ? { startUrl } : {}) });
  if (sanitized.dropped.length > 0) emit({ type: "plan.sanitized", dropped: sanitized.dropped });
  const plan = { ...rawPlan, steps: sanitized.steps };
  state = {
    ...state,
    status: "running",
    steps: plan.steps.map((s, i) => {
      const id = `s${i + 1}`;
      criteria.set(id, s.provenBy);
      return { id, intent: s.intent, action: s.action, status: "pending" as const, attempts: 0, lastObservation: null, reason: "", failure: null };
    }),
  };
  emit({ type: "plan.ready", understanding: plan.understanding, steps: state.steps.map((s) => ({ id: s.id, intent: s.intent, provenBy: criteria.get(s.id) })) });

  // ── ACT → OBSERVE → VERIFY ───────────────────────────────────────────────────────────────
  let dispatched = 0;
  let repairRounds = 0;
  // Whether the previous dispatch changed anything at all. Tracked ACROSS steps, because "we are
  // acting and the world is not moving" is only visible from one step to the next.
  let worldChanged = false;
  let lastObs: Observation | null = null;

  while (true) {
    const step = state.steps.find((s) => s.status === "pending");
    if (!step) break;
    if (dispatched >= maxSteps) {
      state = { ...state, steps: state.steps.map((s) => (s.status === "pending" ? { ...s, status: "skipped", reason: "step budget reached before this step was attempted" } : s)) };
      emit({ type: "budget.exhausted", maxSteps });
      break;
    }

    const provenBefore = provenCount(state);

    // ── THE BLIND-SUBMIT GATE ──────────────────────────────────────────────────────────────
    // Before dispatching anything, check what the page says is still required. If some required
    // control has no step aimed at it, fix that FIRST. The alternative — carry on, submit, read
    // the rejection, then come back for the fields the form had been advertising all along — is
    // the behaviour that makes an agent look blind, and it is avoided here in code rather than by
    // hoping the model remembers to look.
    if (repairRounds < MAX_REPAIR_ROUNDS) {
      const pendingSteps = state.steps.filter((s) => s.status === "pending");
      const unaddressed = unaddressedRequired(lastObs?.outstandingRequired ?? [], pendingSteps);
      if (unaddressed.length > 0) {
        repairRounds += 1;
        const repair = await repairFlow({ goal, outstanding: unaddressed, pageText: lastObs?.pageText ?? "" });
        if (repair.steps.length > 0) {
          const at = state.steps.findIndex((s) => s.id === step.id);
          const inserted = repair.steps.map((r, i) => {
            const id = `r${repairRounds}.${i + 1}`;
            criteria.set(id, r.provenBy);
            return { id, intent: r.intent, action: r.action, status: "pending" as const, attempts: 0, lastObservation: null, reason: "", failure: null };
          });
          state = { ...state, steps: [...state.steps.slice(0, at), ...inserted, ...state.steps.slice(at)] };
          emit({ type: "repair.inserted", outstanding: unaddressed, steps: inserted.map((s) => ({ id: s.id, intent: s.intent, action: s.action })) });
          continue;
        }
        emit({ type: "repair.empty", outstanding: unaddressed });
      }
    }

    // The recovery policy decides whether we may dispatch at all — in code, not by asking the model.
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

    // ── ALREADY DONE? ──────────────────────────────────────────────────────────────────────
    // Not skipped — VERIFIED. The step's criterion still has to be confirmed by the verifier from
    // evidence, exactly as if the action had run. The only thing saved is a pointless action; the
    // burden of proof is unchanged.
    if (alreadySatisfied(step.action, lastObs)) {
      const ev = recordEvidence(step.id, step.action, lastObs as Observation, { executor: executor.name, preExisting: executor.preExisting });
      evidence.push(ev);
      const v = await verifyFlow({ criterion: criteria.get(step.id) ?? step.intent, evidence: [ev] });
      verdicts.set(step.id, v);
      state = {
        ...state,
        evidenceIds: [...state.evidenceIds, ev.id],
        steps: state.steps.map((s) =>
          s.id === step.id
            ? { ...s, status: v.verdict === "proven" ? "proven" : "attempted", reason: v.verdict === "proven" ? "" : v.reasoning, lastObservation: lastObs }
            : s,
        ),
      };
      emit({ type: "step.already_satisfied", id: step.id, intent: step.intent, verdict: v.verdict, cited: v.citedEvidence });
      state = noteStep(state, provenBefore);
      continue;
    }

    // ── NAVIGATION BOUNDARY ────────────────────────────────────────────────────────────────
    // A model-generated URL is untrusted by construction — it may have been suggested by the page
    // the model just read. This is refused in code, and recorded as BLOCKED rather than failed:
    // the step was never attempted, and a receipt that says "failed" would claim otherwise.
    if (step.action.kind === "navigate") {
      const verdict = isNavigationAllowed(step.action.url, allowedOrigins);
      if (!verdict.allowed) {
        state = {
          ...state,
          steps: state.steps.map((s) =>
            s.id === step.id
              ? { ...s, status: "blocked" as const, reason: `navigation refused: ${verdict.why}`, failure: classifyFailure("policy_refused", verdict.why) }
              : s,
          ),
        };
        emit({ type: "policy.refused", id: step.id, url: step.action.url, why: verdict.why });
        state = noteStep(state, provenBefore);
        continue;
      }
    }

    emit({ type: "step.start", id: step.id, intent: step.intent, action: step.action });
    const obs = await executor.execute(step.action);
    dispatched += 1;
    worldChanged = obs.ok;
    lastObs = obs;

    const ev = recordEvidence(step.id, step.action, obs, { executor: executor.name, preExisting: executor.preExisting });
    evidence.push(ev);
    state = {
      ...state,
      evidenceIds: [...state.evidenceIds, ev.id],
      steps: state.steps.map((s) =>
        s.id === step.id
          ? {
              ...s,
              attempts: s.attempts + 1,
              lastObservation: obs,
              status: obs.ok ? ("attempted" as const) : ("failed" as const),
              reason: obs.ok ? "" : `${obs.failure ?? "unknown"}: ${obs.detail}`,
              // The typed failure rides alongside the prose so recovery can read retryability
              // instead of pattern-matching a sentence.
              failure: obs.ok ? null : classifyFailure(obs.failure ?? "transport", obs.detail),
            }
          : s,
      ),
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
    dropped: sanitized.dropped,
  });
  emit({ type: "mission.done", outcome: receipt.outcome, headline: receipt.headline });
  return { state, receipt, evidence };
}
