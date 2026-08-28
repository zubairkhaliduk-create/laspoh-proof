# Disclosure of Pre-Existing Work

This document is written to be shipped, substantially unchanged, in the README and the
Devpost submission. It is not a formality — it is the honest answer to the first question a
judge should ask.

---

## The disclosure

**Laspoh** is a pre-existing experimental browser-automation platform. Its repository begins
on **24 June 2026**, forty days before this hackathon's submission period opened, and 462 of
its 542 commits predate 3 August 2026. **It is not this submission and is not presented as
hackathon work.**

**Laspoh Proof** is a new Gemini + Genkit autonomous verification agent built during the
**3–31 August 2026** submission period. Its first commit is 20 August 2026 and it has no
history before the period. The submitted agent's planning, orchestration, mission state,
reference executor, evidence pipeline, independent verification, recovery, loop defence and
receipt architecture were all developed during the submission period.

Where an optional Laspoh execution adapter is included, that pre-existing component is
explicitly disclosed, is disabled by default, and is not presented as hackathon work.

---

## Provenance ledger

| Component | Origin | Built | Location |
|---|---|---|---|
| Mission orchestrator | New | In period | `src/core/orchestrator.ts` |
| Planner flow (Gemini) | New | In period | `src/flows/plan.ts` |
| Repair flow (Gemini) | New | In period | `src/flows/repair.ts` |
| Independent verifier (Gemini) | New | In period | `src/flows/verify.ts` |
| Mission state machine | New | In period | `src/core/state.ts` |
| Evidence model | New | In period | `src/core/evidence.ts` |
| Receipts | New | In period | `src/core/receipt.ts` |
| Recovery / loop defence | New | In period | `src/core/recovery.ts` |
| Executor interface | New | In period | `src/executors/types.ts` |
| Reference executor (Playwright) | New | In period | `src/executors/reference.ts` |
| Demo target | New | In period | `src/demo/target.ts` |
| Cloud Run service | New | In period | `src/server.ts`, `Dockerfile`, `deploy.sh` |
| **Laspoh adapter** | **New code, reaching PRE-EXISTING runtime** | In period | `src/executors/laspoh.ts` |
| **The Laspoh runtime itself** | **PRE-EXISTING (from 2026-06-24)** | Before period | Separate repository, not submitted |

## How the boundary is enforced in code, not just in prose

1. **`preExisting` is a field on the interface**, not a footnote. `Executor` requires
   `readonly preExisting: boolean`. The reference executor declares `false`; the adapter
   declares `true`.
2. **Every receipt records it.** `buildReceipt` carries executor name and provenance, so any
   result produced through pre-existing machinery says so on its face.
3. **It is off by default.** `src/server.ts` selects the adapter only when a caller names it.
4. **It carries no logic.** The adapter is 73 lines of HTTP transport and defensive
   normalisation. It cannot plan, decide or judge — the interface forbids it.

## What was learned rather than copied

The design of this project comes from watching the pre-existing system fail in specific,
instructive ways: missions reporting success with nothing submitted; a stall detector that
pushed an agent into premature submits; form reading that was blind to requirements the page
was advertising in plain sight.

Those experiences shaped what this project verifies and how. They are **learnings, not
code** — an import audit of the new source tree returns zero references to the old project,
and the three colliding filenames share between two and nine lines of type declarations and
comment markers apiece.

## What has been demonstrated about the adapter, and what has not

**Demonstrated (Phase 08, `test/adapter.test.ts`):** the adapter satisfies the executor contract
over the real HTTP transport. It sends the action, normalises the reply, survives an unreachable
bridge, an HTTP error, a body that never arrives, and a malformed reply — and the agent consumes
its Observations in exactly the shape it consumes the reference executor's.

**Not demonstrated:** that the pre-existing Laspoh runtime works through it. The bridge in those
tests is a **stub speaking the bridge protocol**, because the real bridge is not a running service.
Claiming the adapter had exercised Laspoh would be exactly the kind of overclaim this project is
built to prevent, so it is stated here instead.

What that means for the swap test is unchanged and, if anything, stronger: the submission runs on
the new reference executor, and the second implementation has now been shown to satisfy the same
interface at runtime rather than only at compile time.

**A defect this found:** the adapter used `Boolean(raw.ok)`, and `Boolean("yes")` is true — so is
`Boolean("failed")`. A malformed or hostile bridge could have reported success by sending any
non-empty string. Now `raw.ok === true`, strictly. Recorded because the test that found it exists
only because Phase 00 wrote the weakness down instead of glossing it.

## Verifying this disclosure

    # dates
    cd laspoh       && git log --reverse --format='%h %ad' --date=iso | head -1
    cd laspoh-proof && git log --reverse --format='%h %ad' --date=iso | head -1

    # no code dependency
    cd laspoh-proof && grep -rn "andiwal/laspoh\|@laspoh/" src test

    # the adapter is optional
    cd laspoh-proof && grep -n "LaspohExecutor" src/server.ts

    # remove it and the project still runs
    # The demo runs with the adapter file deleted — it imports only ReferenceExecutor:
    cd laspoh-proof && rm src/executors/laspoh.ts && npx tsx run-demo.ts

    # Be precise about what that does and does not show. Deleting the file also breaks
    # `pnpm typecheck`, `pnpm build` and one test suite, because src/server.ts imports it and
    # test/adapter.test.ts exercises it. That is a statement about NEW glue code written during
    # the submission period — not about the pre-existing work, none of which is in this
    # repository. Removing the pre-existing work requires deleting nothing, because there is
    # nothing here to delete: the adapter is 80 lines of fetch and normalisation reaching an
    # HTTP bridge, and it contains no automation logic.
    #
    # The honest removal test, which does pass:
    cd laspoh-proof && rm src/executors/laspoh.ts test/adapter.test.ts \
      && sed -i '' '/executors\/laspoh.js/d;/LaspohExecutor/d' src/server.ts \
      && pnpm typecheck && pnpm test && npx tsx run-demo.ts
