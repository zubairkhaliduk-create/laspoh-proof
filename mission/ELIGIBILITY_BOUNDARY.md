# Eligibility Boundary

The one question this document answers: **which work is the hackathon submission, and which
work merely exists nearby?**

Every claim here is reproducible from the two repositories with the commands shown.

---

## The line

| | Pre-existing | Hackathon submission |
|---|---|---|
| Project | Laspoh | Laspoh Proof |
| Repository | `andiwal/laspoh` | `andiwal/laspoh-proof` |
| First commit | **2026-06-24** | **2026-08-20** |
| Commits before 2026-08-03 | **462** | **0** |
| Submitted? | **No** | **Yes** |

    cd laspoh       && git log --reverse --format='%h %ad' --date=iso | head -1
    # f59945f 2026-06-24 00:57:53 +0100

    cd laspoh-proof && git log --reverse --format='%h %ad' --date=iso | head -1
    # 34674e7 2026-08-20 15:53:35 +0100

Laspoh predates the submission period by forty days. It is not presented as hackathon work,
its history is not rewritten, and no commit dates are altered anywhere in this program.

---

## What the submission owns

Every judged capability is implemented in the new repository, during the submission period:

- **Mission interpretation and planning** — `src/flows/plan.ts` (Genkit + Gemini)
- **Orchestration** — `src/core/orchestrator.ts`
- **Mission state** — `src/core/state.ts`
- **Execution coordination** — `src/executors/types.ts` (the seam)
- **Evidence collection** — `src/core/evidence.ts`
- **Independent verification** — `src/flows/verify.ts` (Genkit + Gemini)
- **Completion determination** — `src/core/state.ts` (`provenCount`, `terminalStatus`)
- **Recovery and loop defence** — `src/core/recovery.ts`
- **Repair of overlooked requirements** — `src/flows/repair.ts` (Genkit + Gemini)
- **Receipts** — `src/core/receipt.ts`
- **Reference browser executor** — `src/executors/reference.ts`
- **Service and demo target** — `src/server.ts`, `src/demo/target.ts`

## What the submission does not own

`src/executors/laspoh.ts` — 73 lines, written during the period, but it *reaches* pre-existing
work over HTTP. That pre-existing runtime is disclosed, optional, off by default, and carries
`preExisting: true` into every receipt produced through it.

---

## The swap test

> If the pre-existing component were replaced by another executor implementing the same
> interface, would the project still exist, still work, and still demonstrate its judged
> capabilities?

**Yes — and this is demonstrated, not argued.**

The default executor is the new `ReferenceExecutor`. The deployed service, the end-to-end
demo and the entire test suite run through it. The Laspoh adapter is unreachable unless a
caller explicitly asks for it by name:

    src/server.ts:42
    return name === "laspoh" ? new LaspohExecutor() : new ReferenceExecutor(...)

Remove `src/executors/laspoh.ts` entirely and the submission still runs, still verifies,
still produces receipts, and still demos. That is the test, and it passes.

---

## Code-provenance audit

Run on 2026-08-24 against the full new source tree.

**Imports** — the new project references no pre-existing code:

    grep -rn "andiwal/laspoh\|@laspoh/\|from \"../../laspoh" src test
    → no matches

**Copies** — three filenames collide between the repositories. Content was compared:

| New file | Old file | Lines | Non-trivial identical lines |
|---|---|---|---|
| `core/receipt.ts` | `sidepanel/receipt.ts` | 75 vs 92 | 2 |
| `core/recovery.ts` | `background/recovery.ts` | 78 vs 543 | 9 |
| `flows/verify.ts` | `api/auth/verify.ts` | 130 vs 80 | 2 |

The nine in `recovery.ts` are type-declaration lines, two guard clauses and three JSDoc
openers — convergent idiom between independent implementations, not transferred code. (The
`verify.ts` collision is coincidental: the old file verifies auth tokens.)

---

## What genuinely crossed over: ideas

The new architecture is informed by failures observed while building the pre-existing
system — agents that report success they cannot support, stall detectors that manufacture
the failure they were meant to catch, form-reading that goes blind before it goes wrong.

Those are **learnings, not code**, and the submission says so plainly rather than
pretending the design arrived from nowhere. Nothing in the rules requires a new project to
be built by someone with no prior experience of the problem.
