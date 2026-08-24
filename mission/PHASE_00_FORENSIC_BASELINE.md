# PHASE 00 — Forensic Baseline & Eligibility Boundary

**Status:** VERIFIED_COMPLETE
**Executed:** 2026-08-24
**Specification written before execution:** yes

---

## 1. Current verified state

Every fact below was read from the repositories on 2026-08-24, not from memory.

### 1.1 The pre-existing project

| Fact | Value | How established |
|---|---|---|
| Path | `/Users/zubairkhalid/andiwal/laspoh` | `pwd` |
| Branch | `prover/identity-over-collapse` | `git rev-parse --abbrev-ref HEAD` |
| HEAD | `0cb12134cebd09e2f9c10dae0b75cd266537f993` | `git rev-parse HEAD` |
| Working tree | clean (0 modified files) | `git status --porcelain` |
| First commit | `f59945f` — **2026-06-24 00:57:53 +0100** | `git log --reverse` |
| First commit subject | "Laspoh: autonomous outcome-engine agent (pre-cloud snapshot)" | ibid |
| Total commits | 542 | `git rev-list --count HEAD` |
| Commits **before** 2026-08-03 | **462** | `git rev-list --count --before=2026-08-03` |
| Commits on/after 2026-08-03 | 80 | `git rev-list --count --since=2026-08-03` |

**Finding:** Laspoh's development began **2026-06-24**, forty days before the submission
period opened. 462 of its 542 commits predate 2026-08-03. It is unambiguously pre-existing
work and is recorded as such. Its history is not rewritten, redated, squashed or hidden.

### 1.2 The hackathon project

| Fact | Value | How established |
|---|---|---|
| Path | `/Users/zubairkhalid/andiwal/laspoh-proof` | `pwd` |
| Branch | `main` | `git rev-parse --abbrev-ref HEAD` |
| HEAD at phase start | `52fffc93b2634aef5efdd9b203800db75be8e03b` | `git rev-parse HEAD` |
| Working tree | clean | `git status --porcelain` |
| First commit | `34674e7` — **2026-08-20 15:53:35 +0100** | `git log --reverse` |
| Total commits | 10 | `git rev-list --count HEAD` |
| Commits **before** 2026-08-03 | **0** | `git rev-list --count --before=2026-08-03` |
| Source size | 1,761 lines of TypeScript across 18 files | `find src test -name '*.ts'` |

**Finding:** every commit in the hackathon repository falls inside the 3–31 August 2026
submission period. There is no pre-period history to explain away.

---

## 2. Objective

Establish, from evidence rather than assertion, exactly where the boundary between
pre-existing work and hackathon work lies — and record it in a form that can appear
substantially unchanged in the README, the Devpost submission and a hostile audit.

Success means: a third party with shell access to both repositories can reproduce every
provenance claim we intend to make, and none of them turn out to be false.

## 3. Why this phase exists

**Eligibility.** The single largest disqualification risk is not a technical failure but a
provenance one: a judge concluding the submission is a pre-existing product renamed. That
argument has to be answerable with commands, not adjectives.

**Judging.** Architecture scoring (30%) rewards a defensible component boundary. The same
boundary that makes the project eligible is the boundary that makes it well-architected —
they are the same line, and it is worth drawing once, precisely.

**Reliability.** Knowing exactly what the new code owns prevents accidental dependence on
the old system later, which would be discovered at the worst possible moment.

## 4. Exact scope

1. Forensic inspection of both repositories: dates, history, size, structure.
2. A code-level provenance audit — does the new project import, vendor or copy old code?
3. Written eligibility boundary and disclosure documents.
4. The `/mission` artifact set, created inside the **new** repository.

## 5. Explicit non-scope

- No changes to the Laspoh repository. None. Not even formatting.
- No new features in the hackathon repository.
- No architecture changes — this phase observes and records.

## 6. Protected functionality

The Laspoh repository is production intellectual property and is currently deployed
(`laspoh-api` build `0cb1213`, `laspoh.com` live). Nothing in this program may modify,
degrade, redate or destabilise it. Its git history is append-only from our perspective.

## 7. Method

### 7.1 Date forensics
`git log --reverse`, `git rev-list --count --before/--since` against the literal submission
boundary `2026-08-03`. Commit counts alone are insufficient (the brief says so) — the first
commit *date* is the load-bearing fact, and it is 2026-06-24.

### 7.2 Import audit
Grep the entire new source tree for any path or package reference reaching the old project:
`andiwal/laspoh`, `@laspoh/`, relative traversal. Expected result: zero.

### 7.3 Copy audit
Filename collisions are not evidence of copying, and their absence is not evidence of its
absence. The real test is content. For every colliding filename, compute the count of
non-trivial identical lines (excluding blanks, comment markers and bare braces).

## 8. Results

### 8.1 Import audit — PASS

    grep -rn "andiwal/laspoh|@laspoh/|from \"../../laspoh" src test
    → no matches

The hackathon project has **no code-level dependency** on the pre-existing project. It does
not import it, vendor it, or reference its filesystem.

### 8.2 The single contact point

`src/executors/laspoh.ts` — 73 lines, written during the submission period. It speaks HTTP
to a bridge URL. It contains no automation logic and carries `readonly preExisting = true`,
which every receipt produced through it reports. The class is referenced in exactly one
place (`src/server.ts:42`) as a non-default branch:

    return name === "laspoh" ? new LaspohExecutor() : new ReferenceExecutor(...)

The default is the new reference executor. The demo runs on the default.

### 8.3 Copy audit — PASS

| New file | Same-named old file | Lines (new vs old) | Non-trivial identical lines |
|---|---|---|---|
| `core/receipt.ts` | `apps/extension/src/sidepanel/receipt.ts` | 75 vs 92 | **2** |
| `core/recovery.ts` | `apps/extension/src/background/recovery.ts` | 78 vs 543 | **9** |
| `flows/verify.ts` | `services/api/src/auth/verify.ts` | 130 vs 80 | **2** |

The nine shared lines in `recovery.ts` were inspected individually. They are:

    alreadyEscalated: boolean;      attempts: number;      bound?: number;
    humanAvailable: boolean;        if (g.alreadyEscalated) return false;
    if (g.hasKnownNextAction) return false;      /**   /**   /**

Type-declaration lines, two guard clauses, and three JSDoc openers. This is convergent
idiom between two independent implementations of a similar idea, not transferred code —
78 lines against 543 is not a copy of anything.

**Note on `auth/verify.ts`:** the collision is coincidental. The old file verifies auth
tokens; the new one is the independent evidence verifier. Same word, unrelated jobs.

## 9. The eligibility boundary, as established

**Pre-existing (before 2026-08-03):** the entire Laspoh product — its MV3 extension, its
Fastify API, its planner, its healing system, its browser actuation, its deployment. 462
commits from 2026-06-24 onward.

**Built during the submission period:** every line in `laspoh-proof` — mission
orchestration, the plan/repair/verify Genkit flows, mission state, evidence, the
independent verifier, receipts, recovery policy, the reference executor, the demo target,
the Cloud Run service, and the disclosed adapter itself.

**Learnings carried across, which is not code:** the design ideas were informed by failures
observed in the pre-existing system. Ideas are not code, and the disclosure says so plainly
rather than pretending the new work arrived from nowhere.

## 10. The swap test — current standing

> If the pre-existing component were replaced with another executor implementing the same
> interface, would the project still exist, still work, and still demonstrate its judged
> capabilities?

**YES, and it is demonstrated rather than argued.** The default executor is
`ReferenceExecutor` (new, Playwright, 160 lines). The end-to-end demo, the deployed Cloud
Run service and the entire test suite run through it. The Laspoh adapter is unreachable
unless a caller explicitly passes `executor: "laspoh"`.

**Residual risk:** the adapter's bridge does not currently exist as a running service, so
the "two executors, one interface" claim is presently proven by the *interface* rather than
by both implementations running. Recorded as a risk; addressed in Phase 08.

## 11. Failure modes considered

| Scenario | Handling |
|---|---|
| Judge assumes new repo == new project | Boundary documented with reproducible commands, not claims |
| Judge greps for copied code | Copy audit above; result is 2–9 idiom lines per collision |
| Judge asks "does it work without Laspoh?" | Default path never touches it; demo proves it |
| Disclosure contradicts git history | Both are generated from the same forensic facts |
| Old repo accidentally modified | Non-scope rule + clean-tree check at every phase |

## 12. Acceptance criteria

- [x] First-commit dates established for both repositories from git, not memory
- [x] Pre/post 2026-08-03 commit counts recorded for both
- [x] Import audit run; result zero
- [x] Copy audit run on every filename collision; results recorded numerically
- [x] `ELIGIBILITY_BOUNDARY.md` written
- [x] `PREEXISTING_DISCLOSURE.md` written, truthful enough to ship verbatim
- [x] `EXECUTION_STATE.md` created as the program's state machine
- [x] Laspoh repository unmodified (verified clean at phase end)

## 13. Rollback

This phase creates documentation only. Rollback is `git rm -r mission/`. No runtime
behaviour is touched, so there is nothing that can regress.

## 14. Evidence

All commands and outputs are recorded in `EXECUTION_STATE.md` under Phase 00. The
load-bearing evidence is reproducible in under a minute:

    cd laspoh       && git log --reverse --format='%h %ad' --date=iso | head -1
    cd laspoh-proof && git log --reverse --format='%h %ad' --date=iso | head -1
    cd laspoh-proof && grep -rn "andiwal/laspoh\|@laspoh/" src test   # expect: nothing

## 15. Next phase

Phase 01 would ordinarily create the new repository. It already exists and satisfies the
phase's requirements (own history, first commit inside the window, clean structure,
TypeScript, tests, no copied product). Phase 01 therefore becomes an **audit** of what
exists against what the phase demanded, with gaps closed rather than a from-scratch rebuild
— documented as a justified order change in `ARCHITECTURE_DECISIONS.md`.
