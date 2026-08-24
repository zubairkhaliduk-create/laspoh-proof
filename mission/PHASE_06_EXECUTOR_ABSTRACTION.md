# PHASE 06 — Executor Abstraction

**Status:** IN_PROGRESS → see completion report

## 1. Current verified state

    src/executors/types.ts
      ActionSchema      navigate | inspect | fill | select | click | read
      ObservationSchema ok, failure, detail, pageText, url, outstandingRequired, formState, identifiers
      Executor          { name, preExisting, execute(action), close?() }

## 2. Objective

Make this boundary carry the whole weight the project puts on it: it is simultaneously the
architecture story (reasoning separated from actuation) and the eligibility story (pre-existing
work is a dependency behind an interface, not the submission).

## 3. Why this phase exists

If the interface is too wide, the executor starts making decisions and the separation is a
fiction. If it is too narrow, the agent cannot express the mission and the reference executor
becomes a special case rather than a genuine implementation. Both failures are invisible until
something else breaks.

## 4. Gaps found by audit against the specification

| # | Gap | Assessment |
|---|---|---|
| E1 | **No `wait` verb.** The specification names waiting as a required capability, and a page that loads asynchronously currently has to be handled by a repeated `inspect`. | Real. A wait expressed as repeated inspection is a loop the recovery layer then has to recognise as *not* a loop. |
| E2 | **No cancellation.** A mission cannot be stopped mid-action; `close()` disposes the executor but nothing interrupts an in-flight action. | Real. "Cancellation" is named in the specification, and an agent that cannot be stopped is a liability in a live demo. |
| E3 | **No per-action timeout in the interface.** The reference executor has internal timeouts; the *contract* does not require one, so a future executor could block forever and satisfy the interface. | Real, and the dangerous kind — the contract permits a hang. |
| E4 | Interface allows an executor to plan or judge | **Not a gap.** `execute(action) -> Observation` is structurally incapable of either: it receives one action and returns what was observed. |

## 5. Exact scope

1. Add a `wait` action with an explicit, bounded condition.
2. Add cooperative cancellation via `AbortSignal` on the interface.
3. Require a timeout in the contract, documented as a guarantee callers may rely on.

## 6. Explicit non-scope

- No widening toward decision-making. No verb that takes a goal, a plan or a criterion.
- No screenshot verb — evidence is already text and structure, and an image the verifier cannot
  read is decoration. (Revisit only if the verifier gains vision.)

## 7. Protected functionality

Both existing executors must continue to satisfy the interface. 76 tests stay green. The
`preExisting` flag stays on the interface — it is the structural half of the disclosure.

## 8. Data contract changes

    { kind: "wait", forText?: string, forGone?: string, maxMs: number }

A wait must state what it is waiting FOR and for how long. A bare "wait 5 seconds" is a sleep
dressed as an observation, and it makes missions slower without making them more reliable.

    execute(action, ctx?: { signal?: AbortSignal }): Promise<Observation>

## 9. Failure modes

| Scenario | Required behaviour |
|---|---|
| `wait` condition never satisfied | Returns `ok: false` with `no_effect` after `maxMs` — a timeout is an observation, not an exception |
| Cancelled mid-action | Returns an observation marked `transport` with a cancellation detail; never throws |
| Executor ignores the signal | Permitted but discouraged; the orchestrator's budget still bounds the mission |

## 10. Tests

Both new verbs against a real browser and a real page, including the timeout path — the case
that must not hang the suite.

## 11. Acceptance criteria

- [ ] `wait` exists, is bounded, and states its condition
- [ ] Cancellation is expressible and returns an observation rather than throwing
- [ ] Both executors still satisfy the interface
- [ ] All prior tests green

## 12. Evidence required

Test output, commit SHA.
