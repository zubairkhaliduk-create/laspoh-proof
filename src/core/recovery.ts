/**
 * RECOVERY — what the system does when the world does not cooperate.
 *
 * These are pure predicates over counters, deliberately kept out of the model's hands. An LLM
 * asked "are you stuck?" will usually say no and try again, which is precisely how agents burn
 * money in circles. The decision to stop, escalate or ask a human is therefore made in plain code
 * that can be unit-tested and cannot be talked out of its verdict by a confident-sounding plan.
 *
 * Every rule here was earned from an observed failure in a production browser agent:
 *
 *  - REPEAT: the same action against the same target, twice, with nothing changing in between, is
 *    never worth a third try. Something material must differ first.
 *  - WANDERING: an agent can look busy indefinitely — every action succeeding, the page changing
 *    each time — while banking nothing. Counters keyed to page CHANGE are blind to this, because
 *    churn resets them. Progress must therefore be measured in PROVEN work, nothing else.
 *  - KNOWN NEXT ACTION: when the page itself states what is missing (an unanswered required
 *    field), the mission is not stuck — it has a stated next move. Escalating over that ground
 *    truth pushes an agent to submit prematurely, which is worse than doing nothing.
 */

export const REPEAT_BOUND = 2;
export const WANDERING_BOUND = 8;
/** Below this, a mission is still legitimately orienting: navigating and reading bank nothing yet. */
export const WANDERING_MIN_STEPS = 4;

export type Intervention =
  | { kind: "continue" }
  | { kind: "retry_differently"; why: string }
  | { kind: "escalate"; why: string }
  | { kind: "ask_human"; why: string };

/** The same attempt, again, with nothing changed — refuse before spending on it. */
export function isBlindRepeat(g: { attempts: number; worldChangedSinceLastAttempt: boolean }): boolean {
  return g.attempts >= REPEAT_BOUND && !g.worldChangedSinceLastAttempt;
}

/**
 * Busy, succeeding, and proving nothing. `hasKnownNextAction` is the guard that stops this firing
 * during honest work: if the page has told us what it needs, that is not wandering.
 */
export function isWandering(g: {
  stepsSinceProgress: number;
  totalSteps: number;
  alreadyEscalated: boolean;
  hasKnownNextAction: boolean;
  bound?: number;
}): boolean {
  if (g.alreadyEscalated) return false;
  if (g.hasKnownNextAction) return false;
  if (g.totalSteps < WANDERING_MIN_STEPS) return false;
  return g.stepsSinceProgress >= (g.bound ?? WANDERING_BOUND);
}

/**
 * One decision point, so the policy lives in a single readable place rather than being smeared
 * across the orchestrator. Order matters: a known next action outranks everything, because acting
 * on stated ground truth is always better than reasoning about being stuck.
 */
/**
 * Should this specific failure be retried at all?
 *
 * Separate from `decide`, which answers "may we dispatch anything". This answers the narrower
 * question the typed failure now makes answerable: a control that does not exist will not come
 * into existence because we asked twice, while a transport blip genuinely might clear. Before the
 * failure was typed, recovery had to infer this from a prose reason — which is how a loop ends up
 * retrying something that can never work.
 */
export function worthRetrying(failure: { retryable: boolean } | null | undefined, attempts: number, bound = 2): boolean {
  if (!failure?.retryable) return false;
  return attempts < bound;
}

export function decide(g: {
  attempts: number;
  worldChangedSinceLastAttempt: boolean;
  stepsSinceProgress: number;
  totalSteps: number;
  alreadyEscalated: boolean;
  hasKnownNextAction: boolean;
  humanAvailable: boolean;
}): Intervention {
  if (g.hasKnownNextAction) return { kind: "continue" };
  if (isBlindRepeat(g)) {
    return { kind: "retry_differently", why: `the same attempt has failed ${g.attempts}× with nothing changing in between` };
  }
  if (isWandering(g)) {
    return g.humanAvailable
      ? { kind: "ask_human", why: `${g.stepsSinceProgress} steps have produced no proven result` }
      : { kind: "escalate", why: `${g.stepsSinceProgress} steps have produced no proven result` };
  }
  return { kind: "continue" };
}
