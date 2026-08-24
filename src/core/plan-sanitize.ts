/**
 * BETWEEN THE PLANNER AND THE WORLD.
 *
 * A schema checks that a plan has the right SHAPE. It cannot check that the plan is a plan. A
 * model will happily return twelve well-typed steps that repeat each other, or a proof criterion
 * that restates the action it is supposed to prove, and every one of those passes zod.
 *
 * The most dangerous of them is the last. `provenBy` is written before the step runs precisely so
 * success cannot be redefined afterwards — but a criterion like "the button was clicked" quietly
 * hands that redefinition back, because now the verifier is asked to confirm that an action
 * occurred rather than that an outcome happened. The verifier would then say "proven", correctly,
 * about the wrong question. That is self-certification laundered through an independent component,
 * and it is the exact substitution this project exists to prevent.
 *
 * So this is a boundary, not a filter. Everything it removes is REPORTED, because a plan silently
 * shortened is a plan nobody can audit.
 */
import type { Action } from "../executors/types.js";

export interface PlanStep {
  intent: string;
  action: Action;
  provenBy: string;
}

export interface DroppedStep {
  intent: string;
  why: string;
}

export interface SanitizedPlan {
  steps: PlanStep[];
  dropped: DroppedStep[];
}

/**
 * Criteria that describe the ACTION rather than an observable outcome.
 *
 * Deliberately narrow: it matches a criterion that is *only* about the action having occurred. A
 * criterion may mention a click as long as it also names something the page must show — "after
 * clicking Submit, a confirmation reference appears" is a real criterion and survives.
 */
// Up to two leading words rather than a list of nouns. The list approach missed "the FORM was
// submitted" for want of one word, which is how keyword lists fail — silently, on the case you
// did not think of. Two words covers "the button", "the submit button", "field", and the bare verb.
const ACTION_RESTATING =
  /^(?:the\s+|a\s+|an\s+)?(?:[\w-]+\s+){0,2}(?:was\s+|were\s+|has\s+been\s+|is\s+)?(?:successfully\s+)?(?:clicked|pressed|filled|typed|selected|checked|ticked|submitted|dispatched|performed|executed|done|actioned|completed)\b/i;

/** Outcome words that redeem an otherwise action-shaped criterion. */
const NAMES_AN_OUTCOME =
  /\b(appears?|appeared|shows?|shown|displays?|displayed|visible|contains?|reads?|confirmation|reference|receipt|message|number|value|state|page|list|empty|closed|updated|success)\b/i;

export function isSelfCertifyingCriterion(provenBy: string): boolean {
  const t = provenBy.trim();
  if (t.length < 8) return true; // nothing that short can describe an observable outcome
  if (!ACTION_RESTATING.test(t)) return false;
  // It opened by restating the action — it survives only if it also names something observable.
  return !NAMES_AN_OUTCOME.test(t);
}

/** Two steps are the same work if they perform the same action on the same target. */
function actionKey(a: Action): string {
  switch (a.kind) {
    case "navigate": return `navigate|${a.url}`;
    case "inspect": return `inspect|${a.note ?? ""}`;
    case "fill": return `fill|${a.field}|${a.value}`;
    case "select": return `select|${a.field}|${a.value}`;
    case "click": return `click|${a.target}`;
    case "read": return `read|${a.of}`;
    case "wait": return `wait|${a.forText ?? ""}|${a.forGone ?? ""}`;
  }
}

/**
 * THE MISSION MUST START WHERE THE MISSION IS.
 *
 * A browser starts on a blank page. If the plan's first step is not a navigation to the mission's
 * starting point, every subsequent step looks for controls on `about:blank`, finds nothing, and the
 * mission reports `blocked` with zero proven — a total failure caused by a missing first line.
 *
 * The planner is ASKED to navigate first, in the prompt, and mostly does. "Mostly" was measured:
 * across production runs, roughly one in five proved nothing, and the signature was always the same
 * — a plan of about five steps, none of them proven.
 *
 * Asking a model to remember something is not a guarantee, and this project's whole argument is
 * that the fix for that is to take the decision away from it. So the navigation is inserted in
 * code. A model that already planned it correctly is unaffected: the duplicate is removed by the
 * deduplication below, which is why this runs first.
 */
export function ensureNavigatesFirst(steps: readonly PlanStep[], startUrl?: string): PlanStep[] {
  if (!startUrl) return [...steps];
  let target: URL;
  try { target = new URL(startUrl); } catch { return [...steps]; }

  const first = steps[0];
  if (first?.action.kind === "navigate") {
    try { if (new URL(first.action.url).origin === target.origin) return [...steps]; } catch { /* fall through */ }
  }
  return [
    {
      intent: `Open the mission's starting page`,
      action: { kind: "navigate", url: startUrl },
      // Not "navigated successfully" — that would restate the action and be rejected by the very
      // check below. What must be true afterwards is that the page is actually showing.
      provenBy: `The page at ${startUrl} is displayed and its content is visible.`,
    },
    ...steps,
  ];
}

export function sanitizePlan(
  steps: readonly PlanStep[],
  opts: { maxSteps?: number; startUrl?: string } = {},
): SanitizedPlan {
  const maxSteps = opts.maxSteps ?? 24;
  // Before anything else: guarantee the mission starts where the mission is.
  steps = ensureNavigatesFirst(steps, opts.startUrl);
  const kept: PlanStep[] = [];
  const dropped: DroppedStep[] = [];
  const seen = new Set<string>();

  for (const step of steps) {
    if (kept.length >= maxSteps) {
      dropped.push({ intent: step.intent, why: `beyond the step budget of ${maxSteps}` });
      continue;
    }
    if (!step.intent?.trim()) {
      dropped.push({ intent: "(no intent)", why: "a step with no stated intent cannot be audited" });
      continue;
    }
    if (isSelfCertifyingCriterion(step.provenBy ?? "")) {
      dropped.push({
        intent: step.intent,
        why: `its proof criterion restates the action ("${(step.provenBy ?? "").trim().slice(0, 60)}") instead of naming something the page must show`,
      });
      continue;
    }
    const key = actionKey(step.action);
    if (seen.has(key)) {
      dropped.push({ intent: step.intent, why: "identical to an earlier step — repetition is not a plan" });
      continue;
    }
    seen.add(key);
    kept.push(step);
  }

  return { steps: kept, dropped };
}
