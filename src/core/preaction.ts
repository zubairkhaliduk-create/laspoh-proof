/**
 * THE PRE-ACTION PROOF GATE — because "sent is sent".
 *
 * This project began with an agent that applied to five recruitment agencies its goal explicitly
 * excluded, then reported success. Post-hoc verification catches the lie in the receipt — but the
 * applications were already sent, and no verdict can recall them. Detection after an irreversible
 * action is an autopsy. The only defence is a gate BEFORE the action.
 *
 * So, for a step that would commit something irreversible, under a goal that states constraints,
 * the orchestrator demands proof FIRST: the same isolated verifier that grades outcomes is asked,
 * on evidence captured from the current page, whether proceeding is consistent with the user's own
 * words. Its three verdicts map exactly onto the decision:
 *
 *   proven        → the page visibly complies; the action may execute.
 *   contradicted  → the page visibly violates a stated constraint; BLOCKED, with the quote.
 *   unproven      → the evidence cannot establish compliance; BLOCKED SAFELY.
 *                   No evidence, no irreversible action.
 *
 * Reusing verifyFlow is the point, not a shortcut: the license to act flows through the same
 * isolation, the same disbelief default, the same mechanical citation grounding and the same
 * demotion-only second-model audit as the verdicts themselves. There is no second, weaker judge
 * for the decision that matters most.
 *
 * This file is the PURE half — classification only, no I/O — so the two decisions that arm the
 * gate are exhaustively testable without a model:
 *   1. is this step irreversible?  (verb evidence in the step's own words)
 *   2. does the goal state constraints at all?  (a goal with none has nothing to gate on;
 *      demanding proof of unstated constraints would block honest work for theatre)
 */

/** Verbs that commit something to the outside world. Content-neutral: matched against the step's
 *  own words (intent + click target), never against a site, company or URL. Conservative in the
 *  irreversible direction — a false positive costs one verification round-trip; a false negative
 *  costs an unrecallable action. */
const IRREVERSIBLE = /\b(submit|apply|send|confirm|pay|purchase|order|book|publish|post|register|sign\s*up|delete|finali[sz]e)\b/i;

export function isIrreversibleStep(step: { intent: string; action: { kind: string; target?: string } }): boolean {
  if (step.action.kind !== "click") return false; // navigation, reading and filling commit nothing
  return IRREVERSIBLE.test(`${step.intent} ${step.action.target ?? ""}`);
}

/** Does the goal state constraints — exclusions ("never X", "no X", "not X") or restrictions
 *  ("only X", "must be X", "except X")? Detected from the user's own words, because the gate's
 *  criterion quotes the goal verbatim: it can only enforce what the user actually said. */
const CONSTRAINT_LANGUAGE = /\b(never|no |not |only |except|exclud|avoid|must (?:be|not)|don'?t|without|unless)\b/i;

export function goalStatesConstraints(goal: string): boolean {
  return CONSTRAINT_LANGUAGE.test(goal);
}

/** The criterion handed to the verifier. Written to make all three verdicts reachable and honest:
 *  compliance must be VISIBLE to prove; a visible violation contradicts; silence is unproven. */
export function preactionCriterion(goal: string, intent: string): string {
  return (
    `PRE-ACTION GATE for the irreversible step: "${intent}". ` +
    `The mission's goal, verbatim: "${goal}". ` +
    `The evidence must VISIBLY establish that performing this step on the current page complies with every constraint stated in that goal. ` +
    `If the goal excludes a category (for example: never recruitment agencies), the evidence must show this page's target is NOT in the excluded category — an explicit statement on the page such as who the employer is. ` +
    `If the evidence shows the target IS in an excluded category, answer "contradicted". ` +
    `If the evidence does not establish the matter either way, answer "unproven" — this step is irreversible and silence is not permission.`
  );
}

export type PreactionDecision =
  | { allow: true; reasoning: string }
  | { allow: false; safely: boolean; reasoning: string };

/** Map the verifier's verdict onto the gate decision. Pure, so the mapping — the entire authority
 *  the gate wields — is pinned by tests rather than prose. */
export function decideFromVerdict(v: { verdict: "proven" | "unproven" | "contradicted"; reasoning?: string }): PreactionDecision {
  if (v.verdict === "proven") return { allow: true, reasoning: v.reasoning ?? "" };
  if (v.verdict === "contradicted") {
    return { allow: false, safely: false, reasoning: `the page visibly violates a stated constraint: ${v.reasoning ?? "(no reasoning given)"}` };
  }
  return { allow: false, safely: true, reasoning: `evidence does not establish that this irreversible step complies with the goal's constraints — no evidence, no irreversible action. ${v.reasoning ?? ""}`.trim() };
}
