# PHASE 24 — Adversarial Competition Review

**Status:** VERIFIED_COMPLETE
Written as a hostile judge trying to disqualify or score down this submission.

Severity: **BLOCKER** (disqualifying) · **MAJOR** (loses a criterion) · **MINOR** · **ACCEPTED**
(a real limitation, defensible, stated rather than hidden).

---

## Eligibility attacks

### "Is this actually new, or Laspoh renamed?" — **ANSWERED**
`git rev-list --count --before=2026-08-03 HEAD` → **0**. First commit 2026-08-20. Laspoh's first
commit is 2026-06-24 with 462 pre-period commits, is disclosed, and is not submitted.

### "You made a new repo. That's not a new project." — **ANSWERED**
Correct, and the submission does not rest on that. Import audit returns zero references. The copy
audit on three colliding filenames found 2, 9 and 2 non-trivial identical lines — type
declarations, two guard clauses, three JSDoc openers, between a 78-line file and a 543-line one.

### "Does the impressive part come from the pre-existing system?" — **ANSWERED**
The adapter is 73 lines of HTTP transport, carries `preExisting = true`, and is **unreachable
unless a caller names it**. The demo, the deployed service and all 142 tests run on the new
reference executor. Delete `src/executors/laspoh.ts` and nothing about the submission changes.

### "The second executor has never executed anything." — **WAS FAIR, NOW ANSWERED**
It was fair, and Phase 00 recorded it as a risk rather than glossing it. Phase 08 runs the adapter
against a stub bridge over real HTTP. **What that proves is the seam; it does not prove the
pre-existing runtime works through it**, and both statements appear in the test, the disclosure and
the README.

## Technology attacks

### "Is Genkit ornamental?" — **ANSWERED**
Three `ai.defineFlow` flows carry every model decision in the system: plan, repair, verify. Remove
Genkit and the agent has no reasoning left. It is not wrapped around anything pre-existing.

### "Is Gemini making meaningful decisions, or formatting output?" — **ANSWERED**
Gemini decides the plan, the values for controls the page reports outstanding, and every verdict.
The **only** path to `proven` is a Gemini verdict that cites evidence.

### "Is Claude secretly the runtime?" — **ANSWERED, and checked**
`grep -rniE "claude|anthropic" src` → no matches. Claude wrote the code; the submitted agent runs
on Gemini via Vertex through Genkit. Verified as a command, not asserted.

### "Is Cloud Run actually involved?" — **ANSWERED**
Deployed, `/health` returns 200, reports route/model/region.

## Integrity attacks — the ones that matter

### "Can evidence be forged?" — **WAS A REAL HOLE. FIXED (Phase 10).**
`enforceCitation` checked a citation *existed*, never that the quoted text was **in** the evidence.
A model could invent "Confirmation reference: GR-000000" and the verdict stood on it — defeating
the isolation, the disbelief default and the pre-committed criterion simultaneously. `groundCitations`
now checks mechanically, and a fabricated quote downgrades the **whole** verdict.

### "Does the agent grade itself indirectly, through the criterion?" — **WAS A REAL HOLE. FIXED (Phase 04).**
A `provenBy` of *"the button was clicked"* asks the verifier to confirm the **action**, not the
outcome — and it answers correctly, about the wrong question. Self-certification laundered through
an independent component. Such steps are now dropped before execution, with the reason recorded.

### "Can a page talk the verifier into a verdict?" — **MITIGATED (Phase 13)**
Page content is fenced with a per-call nonce and labelled as data; a page addressing the agent is
reported to the verifier as evidence of untrustworthiness. **Not eliminated** — see ACCEPTED below.

### "Does the demo hide failures?" — **NO, structurally**
The demo run reports `Proven 7 of 8` and names the failed step. The script explicitly instructs
*not* to edit an honest failure out, because a truthful partial receipt is the point of the project.

## Production-readiness attacks

### "Are the setup instructions reproducible?" — **PARTIAL**
CI runs the documented commands on a clean Ubuntu runner every push (green). **Not yet run on a
clean machine by a human.** Recorded as a residual risk, not claimed.

### "Does it work without your machine?" — **YES** — deployed and publicly reachable.

### "Can the agent loop?" — **BOUNDED**
Blind-repeat and wandering detectors, a step budget, bounded repair rounds, and `worthRetrying`
which refuses to retry a failure that could never succeed.

## Findings raised BY this review

| # | Finding | Severity | Action |
|---|---|---|---|
| A1 | `test/log.test.ts` contained a key-shaped fixture (`AIzaSyA1234567890…`) that a secret scanner could flag during judging | MINOR | Replaced with `AIzaSyDUMMY_FIXTURE_NOT_A_REAL_KEY_00000` |
| A2 | Replacing it made the neighbouring assertion **vacuous** — it still checked for the *old* string, so it passed for the wrong reason | MAJOR (test integrity) | Assertion re-pointed at the current fixture |
| A3 | Firestore path is written and unverified against a live Firestore | MAJOR | Off by default; recorded in README, EXECUTION_STATE and USER_ACTION_REQUIRED |
| A4 | Reliability is not yet a measured rate | MAJOR | Harness built (`run-reliability.ts`); blocked on UA-004 |

**A2 is the one worth dwelling on.** A one-line "safety" edit silently turned a real test into a
test that always passes. It was caught by reading the assertion after changing the fixture — the
same class of defect this project exists to catch, appearing in the project's own test suite.

## ACCEPTED limitations — stated, not hidden

1. **A hostile page displaying fake confirmation text will be believed.** The verifier grounds the
   citation because the quote genuinely is on the page. Grounding proves a quote is real, not that
   the page is honest. The architectural answer is an independent ground-truth source, which the
   demo uses and the general case may not have.
2. **The verifier can be wrong about sufficiency** — citing a real sentence that does not establish
   the criterion. Isolation and a pre-committed criterion mitigate; nothing eliminates.
3. **One workflow, reliable — not twenty.** Deliberate.
