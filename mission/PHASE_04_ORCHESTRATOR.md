# PHASE 04 — Gemini + Genkit Mission Orchestrator

**Status:** IN_PROGRESS → see completion report

---

## 1. Current verified state

    src/flows/plan.ts       planFlow   — Genkit flow, zod PlanSchema, 1–12 steps, provenBy per step
    src/flows/repair.ts     repairFlow — values for controls the PAGE reports outstanding
    src/flows/verify.ts     verifyFlow — isolated verdict + enforceCitation (pure, tested)
    src/core/orchestrator.ts           — plan → gate → act → observe → evidence → verify → state
    54 tests green

The orchestrator already refuses to self-certify: the only path to `proven` is `verifyFlow`
returning a cited verdict, and Phase 03 made `complete` a property over the status set.

## 2. Objective

Make the orchestrator survive a model that is wrong, lazy, or actively strange — without a human
in the loop and without the mission silently doing something absurd.

Success means: every category of bad model output the specification names is either rejected at a
typed boundary or clamped by code, and each is proven by a test that constructs the bad output
directly rather than hoping a live model produces it.

## 3. Why this phase exists

**Judging (30%): "hallucination containment" and "retry discipline" are explicit.** The credible
demonstration is a test suite full of hostile model output, not a claim that the prompt is good.

**Reliability.** Every failure mode here is one that will eventually happen in a live demo. A plan
with twelve steps of padding, a plan that starts by clicking something before navigating, a plan
whose `provenBy` is "the click worked" — these are ordinary model behaviour, not edge cases.

## 4. Gaps found by audit

| # | Gap | Why it matters |
|---|---|---|
| H1 | **Nothing validates the plan beyond its schema.** A plan can be schema-valid and still nonsense: zero real actions, a `provenBy` that proves nothing ("the click worked"), a submit before the fills. | The schema checks shape. Nothing checks that the plan is a plan. |
| H2 | **`planFlow` throws on no output.** An exception mid-mission is a worse failure than an honest empty plan — it loses the mission id and any partial state. | A model returning nothing is expected, not exceptional. |
| H3 | **No step budget derived from the plan.** `maxSteps` defaults to 24 and repair can insert more; a pathological plan plus two repair rounds could exceed what the caller expected. | The budget is the one thing the agent cannot argue with; it should be explicit. |
| H4 | **A `provenBy` that restates the action is accepted.** "The button was clicked" as a proof criterion means the verifier is asked to confirm the action, not the outcome — the exact substitution this project exists to prevent. | It launders self-certification through the verifier. |

## 5. Exact scope

1. A pure, tested `sanitizePlan()` between the planner and the orchestrator.
2. Reject `provenBy` strings that describe the action rather than an observable outcome.
3. Replace the throw with an honest empty-plan result.
4. Adversarial test suite constructing hostile plans directly.

## 6. Explicit non-scope

- No prompt rewriting to "fix" model behaviour. The point is that code holds regardless of prompt.
- No change to the verifier or receipts.
- No new executor verbs.

## 7. Protected functionality

`provenCount`, `terminalStatus`, `enforceCitation`, the blind-submit gate and the already-satisfied
path must all behave identically. 54 tests stay green.

## 8. Data contracts

    sanitizePlan(plan, opts) -> { steps: PlanStep[]; dropped: DroppedStep[] }
    DroppedStep = { intent: string; why: string }

Dropped steps are **returned, not swallowed** — a plan silently shortened is a plan the operator
cannot audit, and the receipt should be able to say what was removed and why.

## 9. Failure modes and required behaviour

| Model output | Required behaviour |
|---|---|
| No structured plan | Empty plan, mission reports `blocked`, no exception |
| Plan of 40 steps | Clamped to the budget; the excess reported as dropped |
| `provenBy: "the click worked"` | Step dropped — it proves the action, not the outcome |
| `provenBy: ""` | Dropped |
| Duplicate identical steps | Deduplicated; repetition is not a plan |
| A step whose action is `inspect` with a `provenBy` about a confirmation | Kept — inspect can legitimately prove a page state |
| Every step dropped | Empty plan, honest `blocked`, never a silent success |

## 10. Tests

Constructed hostile plans, not live model output. Live models are for the demo; determinism is for
the suite.

## 11. Acceptance criteria

- [ ] `sanitizePlan` is pure and exported
- [ ] Action-restating `provenBy` is rejected, with the rejection reason recorded
- [ ] No path throws on absent model output
- [ ] Dropped steps are visible, never silently removed
- [ ] All prior tests green

## 12. Rollback

`sanitizePlan` is additive and pure; removing the call restores previous behaviour exactly.

## 13. Evidence required

Test output, count delta, commit SHA.
