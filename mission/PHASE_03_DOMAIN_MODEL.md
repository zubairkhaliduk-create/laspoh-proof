# PHASE 03 — Core Domain Model & Mission State Machine

**Status:** IN_PROGRESS → see completion report
**Order note:** executed as an audit-and-strengthen, like Phase 01. A working state machine exists
(`src/core/state.ts`, in-period). Replacing it wholesale to follow the phase order literally would
discard tested behaviour and the history proving when it was built. The phase's real requirement —
*make false completion structurally difficult* — is met by finding where the current model still
permits it, and closing those gaps.

---

## 1. Current verified state

Read from `src/core/state.ts` and `src/core/orchestrator.ts` on 2026-08-24.

    StepStatus     pending | attempted | proven | failed | skipped
    MissionStatus  planning | running | verifying | complete | partial | blocked
    provenCount()  counts status === "proven" only
    terminalStatus complete iff every step proven; partial iff proven > 0; else blocked
    noteStep()     clears the stall counter ONLY when provenCount rises

Tests already covering it: 7 assertions in `test/integrity.test.ts` (counting, terminal status,
stall accounting).

## 2. Objective

Make it structurally impossible for this system to report work it cannot prove — not merely
unlikely, and not dependent on any model behaving well.

Success means: every path by which a step could reach a success-shaped state without an
independent verdict is closed, and each closure is pinned by a test that names the failure it
prevents.

## 3. Why this phase exists

**The product claim rests entirely here.** "No proof, no done" is a property of this file or it is
marketing. Every other component — planner, executor, verifier — can be wrong, adversarial or
absent, and the mission must still refuse to overstate itself.

**Judging (30% architecture).** "Evidence-based completion" and "hallucination containment" are
explicit criteria. The credible demonstration is a state machine where the unsafe transition does
not exist, not a prompt asking for honesty.

**Judging (40% utility).** "Partial completion handled truthfully" is explicit. A mission that did
seven of ten things and says so is more useful than one that claims ten.

## 4. Gaps found in the current model

Audited by reading every transition in `orchestrator.ts` against the status set:

| # | Gap | Why it matters |
|---|---|---|
| G1 | **No `blocked` step status.** A step that cannot proceed (missing input, refused by policy, executor unavailable) is recorded as `failed`, which claims it was attempted and did not work. | Conflates "we tried and it failed" with "we could not try". The receipt then misreports what happened, and the reason string is doing work the type should do. |
| G2 | **Failure carries no retryability.** `reason` is prose. Nothing distinguishes a transient transport failure from a permanent "no such control". | Recovery has to re-derive intent from a string, and a caller cannot tell whether a retry is meaningful. |
| G3 | **`terminalStatus` treats `skipped` as neutral.** A mission of one proven step and nine skipped reports `partial` with no indication that most of the work never happened. | Technically true, materially misleading — the number is right and the impression is wrong. |
| G4 | **No invariant test that `complete` is unreachable with any non-proven step.** The current test checks two examples; it does not assert the property across the status set. | An example passes for one case. A property passes for all of them, including statuses added later. |

## 5. Exact scope

1. Add `blocked` to `StepStatus`, with the semantics "could not be attempted, and why".
2. Add a typed `Failure` with an explicit `retryable` boolean and a machine-readable class.
3. Make `terminalStatus` account for skipped work rather than passing over it.
4. Replace example-based completion tests with **exhaustive property tests** over the status set.
5. Surface all of it on the receipt, since a distinction that never reaches the user is internal
   bookkeeping rather than a product feature.

## 6. Explicit non-scope

- No orchestrator control-flow redesign. New statuses are additive.
- No change to the verifier or to `enforceCitation`.
- No change to `provenCount` semantics. It counts `proven` and nothing else, permanently.

## 7. Protected functionality

- `provenCount()` must remain the only number reported as success.
- `terminalStatus()` must never return `complete` unless every step is proven.
- The 45 existing tests must stay green; new statuses must not reclassify existing behaviour.

## 8. Data contracts

    StepStatus  = pending | attempted | proven | failed | skipped | blocked

    Failure = {
      class: "not_found" | "not_actionable" | "no_effect" | "value_discarded"
           | "navigation_failed" | "transport" | "policy_refused" | "missing_input"
      detail: string        // human-readable, never parsed for control flow
      retryable: boolean    // is another attempt meaningful at all?
    }

`retryable` is a fact about the failure, not a decision. Whether to retry stays with recovery.

## 9. Failure modes this phase must survive

| Scenario | Required behaviour |
|---|---|
| Every step blocked | `blocked`, and the receipt says what blocked each one |
| One proven, nine skipped | NOT reported as though nine were fine |
| A status is added later without updating `terminalStatus` | The property test fails |
| Verifier unavailable for the whole mission | Nothing reaches `proven`; outcome is honest |
| A caller mutates status directly to "proven" | Out of scope for types; the orchestrator is the only writer, and only on a verdict |

## 10. Tests (written before implementation)

**Property, not example:** for every subset of the status set containing at least one non-`proven`
status, `terminalStatus` must not return `complete`. Enumerated exhaustively.

- `blocked` is not counted as proven, attempted, or success
- a blocked mission reports `blocked`, not `partial`
- skipped work is visible in the outcome rather than silently dropped
- `retryable` survives onto the receipt
- existing 45 tests unchanged

## 11. Acceptance criteria

- [ ] `blocked` exists and is distinct from `failed` in both type and receipt
- [ ] `Failure` carries a class and `retryable`
- [ ] Exhaustive property test proves `complete` requires all-proven
- [ ] Skipped work is reflected in the terminal status
- [ ] All tests green; no existing test weakened to accommodate the change

## 12. Rollback

Additive to a union type and one function. `git revert` restores the previous model; no persisted
data depends on the new statuses yet (state is in memory — see Phase 05).

## 13. Evidence required

Test output showing the property test enumerating the status set, the new counts, and the full
suite green. Commit SHA.
