# Architecture

```
                    ┌──────────────────────────────────────────────┐
   USER GOAL ──────▶│  POST /missions        (returns immediately)  │
   "apply for the   │  Cloud Run · Node 22 · Express                │
    grant, prove    └───────────────────────┬──────────────────────┘
    you did it"                             │  mission runs in the background
                                            ▼
                    ┌──────────────────────────────────────────────┐
                    │        MISSION ORCHESTRATOR  (new)           │
                    │  the only component allowed to change state  │
                    └───┬───────────────┬───────────────┬──────────┘
                        │               │               │
              ┌─────────▼──────┐  ┌─────▼────────┐  ┌──▼─────────────────┐
              │ PLANNER (new)  │  │  EXECUTION   │  │ INDEPENDENT        │
              │ Genkit flow    │  │  INTERFACE   │  │ VERIFIER (new)     │
              │ Gemini 3.5     │  │  (new)       │  │ Genkit flow        │
              │                │  │              │  │ Gemini 3.5         │
              │ writes each    │  └──┬────────┬──┘  │                    │
              │ step's proof   │     │        │     │ never sees the     │
              │ criterion      │     │        │     │ planner's reasoning│
              │ BEFORE it runs │     │        │     │ or the executor's  │
              └────────────────┘     │        │     │ opinion            │
                                     │        │     └──▲─────────────────┘
                        ┌────────────▼──┐  ┌──▼──────────────┐  │
                        │ REFERENCE     │  │ LASPOH ADAPTER  │  │
                        │ EXECUTOR      │  │ ── DISCLOSED ── │  │
                        │ (new,         │  │ PRE-EXISTING    │  │
                        │  Playwright)  │  │ (June 2026)     │  │
                        └────────┬──────┘  └──┬──────────────┘  │
                                 │            │                 │
                                 ▼            ▼                 │
                          ┌─────────────────────────┐           │
                          │  OBSERVATION            │           │
                          │  what the page SHOWED   │───────────┘
                          │  (never a conclusion)   │  evidence
                          └───────────┬─────────────┘
                                      ▼
                          ┌─────────────────────────┐
                          │  EVIDENCE STORE (new)   │
                          │  excerpt + sha256       │
                          └───────────┬─────────────┘
                                      ▼
                          ┌─────────────────────────┐
                          │  RECEIPT (new)          │
                          │  "Proven 7 of 8"        │
                          │  + integrity hash       │
                          └─────────────────────────┘
```

## The one rule the design exists to enforce

**The component that does the work never grades it.**

A step becomes `proven` only when the independent verifier — which is given the pre-committed
criterion and the observed evidence, and nothing else — confirms it and cites the evidence. Not
when the click fires. Not when the planner is confident. Not when no error appears.

`provenCount` is the only number reported as success. Everything else (steps attempted, actions
dispatched) is activity, and the receipt keeps the two visibly apart.

## Why the executor seam exists

Everything above the seam is the agent; everything below is actuation. Two executors ship behind
one interface so the separation is demonstrated rather than asserted — swap the executor and the
agent is unchanged.

| Executor | Origin | Runs where |
|---|---|---|
| `reference` | **New**, written for this project | Cloud Run (headless Chromium) |
| `laspoh` | **Pre-existing, disclosed** (June 2026) | The user's own authenticated browser, via a bridge |

Every receipt records which executor produced it and whether that executor is pre-existing work,
so provenance is structural rather than a footnote.

## The blind-submit gate

The loop is not plan-then-execute. Between every dispatch it consults what the page says is still
required, because a plan written before anything has seen the page is partly guesswork — a field
the planner calls "Affiliation" turns out to be a dropdown called "Applying as", and a consent
checkbox nobody predicted turns out to be mandatory.

```
   page  ──▶ outstandingRequired[]        (read from the DOM by the executor)
                     │
                     ▼
        unaddressedRequired(outstanding, remaining plan)      ← pure, tested
                     │  what no remaining step would fill
                     ▼
              REPAIR FLOW  (bounded: 2 rounds)
              asked only "what values go in THESE controls"
              never "what should we do next"
                     │
                     ▼
        steps inserted BEFORE the pending step, then dispatch
```

Once repair has acted, a later planned step aimed at the same control is **verified, not skipped** —
the verifier still has to confirm its criterion from evidence. Dispatching it anyway would produce
a no-effect result and record a completed piece of work as a failure, which is a lie in the
safe-looking direction.

The division of labour matters: **the page supplies the facts, the model supplies the values.** The
list of outstanding controls is never model-generated, so the mechanism cannot be talked out of
firing.

## Failure tolerance

Recovery decisions are pure functions over counters, deliberately kept out of the model's hands —
an LLM asked "are you stuck?" will say no and try again.

- **Blind repeat** — the same attempt twice with nothing changed is refused before it is dispatched.
- **Wandering stall** — an agent can look busy indefinitely while proving nothing. Counters keyed
  to page *change* are blind to this because churn resets them, so progress is measured in proven
  work alone.
- **Known next action** — when the page itself names an unanswered required field, the mission is
  not stuck; it has a stated next move. Escalating over that ground truth is what pushes agents to
  submit incomplete forms, so the stall detector stands down.
- **Silent blindness** — the worst class, because it does not look like a failure. When the DOM
  read threw inside the page, the throw was caught and the form reported itself as having no
  fields, which is indistinguishable from an empty form. Every downstream symptom pointed
  elsewhere. `test/executor.test.ts` now asserts the read against a form that is definitely not
  empty, because that is the only way this bug is visible.

## Google stack

| Requirement | Used |
|---|---|
| Gemini 3.5+ | `gemini-3.5-flash` (Vertex AI, `asia-southeast1`) |
| Google agent framework | **Genkit** 1.41 (`@genkit-ai/vertexai`, `@genkit-ai/googleai`) |
| Google Cloud infrastructure | **Cloud Run** (service + async mission execution) |
