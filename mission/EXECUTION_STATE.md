# EXECUTION STATE — Laspoh Proof

The authoritative state machine for this program. Append; never erase.

**Statuses:** NOT_STARTED · IN_PROGRESS · BLOCKED · PARTIAL · VERIFIED_COMPLETE
A phase reaches VERIFIED_COMPLETE only with evidence recorded below it.

---

## Program summary

| Phase | Name | Status |
|---|---|---|
| 00 | Forensic baseline & eligibility boundary | VERIFIED_COMPLETE |
| 01 | Project foundation (audit) | VERIFIED_COMPLETE |
| 02 | Verify & lock the Google stack | PARTIAL (deploy blocked, UA-004) |
| 03 | Core domain model & mission state machine | VERIFIED_COMPLETE |
| 04 | Gemini + Genkit mission orchestrator | VERIFIED_COMPLETE |
| 05 | Persistent state & checkpointing | PARTIAL (Firestore unverified until deploy) |
| 06 | Executor abstraction | VERIFIED_COMPLETE |
| 07 | New reference executor | VERIFIED_COMPLETE |
| 08 | Optional Laspoh executor adapter | VERIFIED_COMPLETE |
| 09 | Evidence collection system | VERIFIED_COMPLETE |
| 10 | Independent verifier | VERIFIED_COMPLETE |
| 11 | Receipts & truthful completion | VERIFIED_COMPLETE |
| 12 | Failure recovery & loop defense | VERIFIED_COMPLETE |
| 13 | Security & trust boundaries | VERIFIED_COMPLETE |
| 14 | Observability & audit trail | VERIFIED_COMPLETE |
| 15 | Killer Taskmaster workflow | IN_PROGRESS |
| 16 | End-to-end test harness | NOT_STARTED |
| 17 | Judge experience | NOT_STARTED |
| 18 | README & reproducible spin-up | VERIFIED_COMPLETE |
| 19 | Architecture diagram | VERIFIED_COMPLETE |
| 20 | Google Cloud proof | NOT_STARTED |
| 21 | Demo video engineering | NOT_STARTED |
| 22 | Devpost submission | NOT_STARTED |
| 23 | Bonus contributions | NOT_STARTED |
| 24 | Adversarial competition review | NOT_STARTED |
| 25 | Final eligibility audit | NOT_STARTED |
| 26 | Final quality gate | NOT_STARTED |
| 27 | Final submission package | NOT_STARTED |

---

## PHASE 00 — Forensic Baseline & Eligibility Boundary

**Status:** VERIFIED_COMPLETE
**Specification:** `mission/PHASE_00_FORENSIC_BASELINE.md`
**Date:** 2026-08-24

### Objective
Establish from evidence where pre-existing work ends and hackathon work begins.

### Start state
- `laspoh` @ `0cb1213`, branch `prover/identity-over-collapse`, clean
- `laspoh-proof` @ `52fffc9`, branch `main`, clean

### Commands run and results

    cd laspoh && git log --reverse --format='%h %ad' --date=iso | head -1
    → f59945f 2026-06-24 00:57:53 +0100

    cd laspoh && git rev-list --count HEAD                      → 542
    cd laspoh && git rev-list --count --before=2026-08-03 HEAD  → 462
    cd laspoh && git rev-list --count --since=2026-08-03 HEAD   → 80

    cd laspoh-proof && git log --reverse --format='%h %ad' --date=iso | head -1
    → 34674e7 2026-08-20 15:53:35 +0100

    cd laspoh-proof && git rev-list --count HEAD                      → 10
    cd laspoh-proof && git rev-list --count --before=2026-08-03 HEAD  → 0

    cd laspoh-proof && grep -rn "andiwal/laspoh|@laspoh/" src test
    → no matches   (no code-level dependency)

Copy audit on the three colliding filenames (non-trivial identical lines):
`receipt.ts` 2 · `recovery.ts` 9 · `verify.ts` 2. The nine were inspected individually and
are type declarations, two guard clauses and three JSDoc openers.

### Implementation summary
Documentation only. No runtime code touched in either repository.

### Files created
- `mission/PHASE_00_FORENSIC_BASELINE.md`
- `mission/ELIGIBILITY_BOUNDARY.md`
- `mission/PREEXISTING_DISCLOSURE.md`
- `mission/EXECUTION_STATE.md` (this file)

### Files modified
None.

### Tests
Not applicable — no runtime change. Regression protection: the Laspoh working tree was
verified clean before and after (`git status --porcelain` → 0 files).

### Eligibility implications
Strongly positive and now evidenced:
- Laspoh's first commit (2026-06-24) is 40 days before the period opened → unambiguously
  pre-existing, disclosed, not submitted.
- `laspoh-proof` has **zero** commits before 2026-08-03 → entirely in-period.
- Zero imports from the old project → the swap test passes structurally.

### Outstanding risks
1. **The two-executor claim is currently proven by interface, not by both running.** The
   Laspoh bridge is not a running service, so "swap the executor and the agent is unchanged"
   is demonstrated one-sided. → Phase 08.
2. **Verifier and planner share one model configuration.** Independence is architectural
   (separate flow, no shared context) but not yet *demonstrated* under adversarial input.
   → Phase 10.
3. **Only one workflow exists** (the self-hosted grant form). Real-world operational utility
   for the 40% criterion needs deliberate selection. → Phase 15.

### Blocked
Nothing.

### Next phase
Phase 01 — audit the existing repository against what "create the new repository" demanded,
and close gaps. Order change from "create" to "audit" is justified and recorded in
`ARCHITECTURE_DECISIONS.md`.

---

## PHASE 01 — Project Foundation (executed as an audit)

**Status:** VERIFIED_COMPLETE
**Specification:** `mission/PHASE_01_PROJECT_FOUNDATION.md`
**Date:** 2026-08-24
**Order change:** AD-003 — audit rather than rebuild, to preserve in-period build history.

### Start state
`laspoh-proof` @ `67f4bdc`, clean, no remote, no linter, no CI, no licence.

### Implementation summary
Scaffolding only; no `src/` behaviour changed.

### Files created
`.env.example` · `LICENSE` (MIT) · `.github/workflows/ci.yml` · `oxlint` config via package.json
script · `mission/PHASE_01_PROJECT_FOUNDATION.md`

### Files modified
`package.json` (lint script, packageManager pin) · `test/executor.test.ts` (one real lint finding)

### Linting — three attempts, and the reason matters
1. `eslint` + `typescript-eslint` → **"typescript-eslint does not support TS 7.0"**.
2. Plain `eslint` → cannot parse TypeScript at all (`Unexpected token MissionState`).
3. **`oxlint`** → parses TS natively, not coupled to the compiler version. Adopted.

Downgrading a working compiler to satisfy a linter was rejected as the wrong trade — `tsc`
already enforces types, and properly. oxlint found one genuine issue (a caret regex where
`startsWith` belongs), fixed.

### Secret scan — the gate before publication
    for pat in AIza… / PRIVATE KEY / "private_key" / ghp_ / gho_ / Bearer…
    git grep -I -l -E "$pat" $(git rev-list --all)
    → zero findings across 11 commits
    git log --all --diff-filter=A --name-only | grep -iE "\.env$|credential|key\.json|\.pem$"
    → nothing ever committed

### Evidence
- **Public repository:** https://github.com/zubairkhaliduk-create/laspoh-proof (PUBLIC, `main`)
- **First commit visible publicly:** `34674e7 2026-08-20 15:53:35 +0100` — inside the submission
  window, independently verifiable by a judge
- **CI run 32746045382 — success**, 1m26s (`gh run list`)
- First CI run **failed** on `playwright install` (the CLI does not exist; this project depends on
  `playwright-core`). Fixed and re-run green. Recorded because it is exactly the class of defect
  CI exists to catch — it passed locally only because the browser was already on the machine.
- `pnpm lint` clean · `pnpm typecheck` clean · **45 tests passing**

### Eligibility implications
Materially improved. The provenance claims in `PREEXISTING_DISCLOSURE.md` were previously
unfalsifiable because no one could read the repository. A judge can now verify the first-commit
date and the absence of pre-period history directly.

### Outstanding risks
1. Setup instructions have never been run on a clean machine → Phase 18.
2. README still the pre-program skeleton → Phase 18.
3. CI runs without model credentials by design; the model-dependent paths are therefore not
   covered by CI → acceptable, but the reliability rate must come from Phase 16 instead.

### Next phase
Phase 02 — verify and lock the Google stack against current official sources rather than
assumption, and prove the qualifying foundation end to end.

---

## PHASE 02 — Verify and Lock the Google Stack

**Status:** PARTIAL — code complete and locally verified; deployment blocked on UA-004
**Specification:** `mission/PHASE_02_GOOGLE_STACK.md`
**Commit:** `0d18b61`

### Finding that changed the plan
`@genkit-ai/vertexai` and `@genkit-ai/googleai` are **superseded** by the unified
`@genkit-ai/google-genai`. Evidence, strongest first:

1. **Our own runtime.** Every cold start of the sibling service prints: *"The @genkit-ai/vertexai
   plugin is deprecated and will be REMOVED in a future release — migrate to
   @genkit-ai/google-genai."*
2. `npm view @genkit-ai/google-genai version` → **1.41.0**, same as the rest of the stack;
   description: "Genkit AI framework plugin for Google AI & Vertex APIs".
3. genkit.dev's Vertex AI page documents the unified package as the one to install.

Also recorded, because it constrains future design rather than today's code: the JS plugins do not
yet persist Gemini 3 `thought_signature` across turns and return 400 on multi-turn reasoning. All
three flows here are single-turn, so it does not apply — but it is why "use the newest model" is
not automatically correct.

### Implementation
One file. `src/genkit.ts` is the only vendor-aware module, so nothing above it changed — that is
what the seam was for, and this migration is the first real test of it.

### Verified
`45 tests green` (at the time of migration) · typecheck clean · lint clean.

### NOT verified — stated plainly
The migration has **not** been exercised against a live model. That needs the deployed service,
and deployment is blocked: the hackathon project `laspoh-proof-260823` belongs to
**zubair@samstar.org**, whose token and ADC have both expired. The other account on this machine
(`zubair@blissio.ai`) is **refused** by the project — checked, not assumed:
`ERROR: does not have permission to access projects instance [laspoh-proof-260823]`.

The deployed service remains up on the previous revision (HTTP 200), so nothing is down.

### Blocked
**UA-004** — `gcloud auth login` AND `gcloud auth application-default login` as zubair@samstar.org.

---

## PHASE 03 — Core Domain Model & Mission State Machine

**Status:** VERIFIED_COMPLETE
**Specification:** `mission/PHASE_03_DOMAIN_MODEL.md`

### Gaps found by auditing every transition, and closed

| # | Gap | Closure |
|---|---|---|
| G1 | No `blocked` status — work that could not be attempted was recorded as `failed` | `blocked` added; distinct in type and in the terminal status |
| G2 | Failures were prose only | Typed `Failure { class, detail, retryable }`; `classifyFailure` decides retryability from the class |
| G3 | `terminalStatus` passed over skipped work | A mission whose unproven steps were never attempted, and which proved less than half, reports `blocked` rather than `partial` |
| G4 | Completion tested by example | Replaced with an **exhaustive property test** |

### The property that now holds
`complete` is written as *"no step is unproven"* rather than a count comparison, so adding a status
later cannot quietly widen success — a new status is unproven by default, which is the safe
direction. The test enumerates every pair over the six-status set (36 combinations) and asserts
`complete` appears only for all-proven.

Also guarded: an **empty** mission. `[].every(...)` is `true`, which is exactly how a vacuous truth
becomes a false success claim.

### Tests
`54 passed` (was 45; +9). Typecheck clean, lint clean.

### Eligibility implications
None — internal to the new code. No pre-existing dependency touched.

### Outstanding risks
1. New statuses are not yet persisted anywhere (state is in memory) → Phase 05.
2. `blocked` is defined and enforced but the orchestrator does not yet emit it for policy refusals
   or missing input; those paths arrive with Phase 12/13. Recorded so the gap is not mistaken for
   completeness.

### Next phase
Phase 04 — audit the Genkit/Gemini orchestrator against its specification, with adversarial tests
for malformed output, hallucinated actions and impossible plans.

---

## PHASE 04 — Gemini + Genkit Mission Orchestrator

**Status:** VERIFIED_COMPLETE
**Specification:** `mission/PHASE_04_ORCHESTRATOR.md`

### Gaps found and closed

| # | Gap | Closure |
|---|---|---|
| H1 | Nothing validated the plan beyond its schema | `sanitizePlan()` — pure, exported, 11 tests |
| H2 | `planFlow` threw when the model returned nothing | Returns an honest empty plan; the mission reports `blocked` through the ordinary path instead of losing its id to an exception |
| H4 | A `provenBy` that restated the action was accepted | Rejected by `isSelfCertifyingCriterion` |

### The one that matters
`provenBy` is written before a step runs precisely so success cannot be redefined afterwards. A
criterion like *"the button was clicked"* hands that redefinition straight back: the verifier is
then asked to confirm the **action**, not the outcome — and it answers CORRECTLY, about the wrong
question. That is self-certification laundered through an independent component, and it defeats
the project's central claim while every component behaves as designed.

Such steps are now dropped before execution, with the reason recorded. Criteria that mention the
action *and* name something observable survive, because over-strictness would be its own failure —
most real criteria mention the action in passing.

### A defect in my own first implementation
The action-restating pattern used a list of nouns (`button|link|control|field|…`) and missed
*"the form was submitted"* for want of one word. That is how keyword lists fail: silently, on the
case you did not think of. Replaced with "up to two leading words before the verb".

### Tests
`65 passed` (was 54; +11). Hostile plans are constructed by hand rather than harvested from a live
model — a live model produces bad plans unpredictably, and a suite needs them on demand.

### Outstanding risks
1. `sanitizePlan` drops steps; the receipt does not yet surface `dropped` to the reader. Recorded —
   Phase 11 owns the receipt.
2. Plan quality itself is still model-dependent; sanitisation bounds the damage, it does not
   improve the plan.

### Next phase
Phase 05 — durable mission state, so a Cloud Run restart does not lose a mission.

---

## PHASE 05 — Persistent State & Checkpointing

**Status:** PARTIAL — in-memory path verified; Firestore unverified until deployment (UA-004)
**Specification:** `mission/PHASE_05_PERSISTENT_STATE.md`

### The problem, from observed evidence rather than theory
Mission state lived in a process-local `Map`. A mission started before a deploy completed on the
**old** revision while the new one answered `404` for it — which looks exactly like a crash, and
was misdiagnosed as one for the better part of an hour (Phase 01 evidence). `--max-instances 1`
existed solely to make in-memory state survivable, so a data-model decision had become a scaling
ceiling.

### Implementation
- `MissionStore` — the only persistence surface the server touches
- `InMemoryStore` — the default; **no cloud, no credentials**, so a judge cloning the repo can run
  a mission immediately. A project whose quick-start begins "first, set up Firestore" is one most
  judges will not run.
- `FirestoreStore` — one document per mission, appends inside a transaction
- Idempotent creation via `idempotencyKey` / `Idempotency-Key`

### Two design decisions worth stating
**`appendEvent` is separate from `update`, and `update` strips `events`.** The event list is the
evidence trail a receipt is built from. An update path able to overwrite it is a path a bug can use
to erase what happened, in a system whose entire claim is that it only reports what it can prove.
Tested directly: an update carrying `events: []` leaves the log intact.

**Firestore degrades loudly.** If it cannot be reached the service falls back to memory and says
so, because a silent downgrade would reintroduce the exact bug this replaces while appearing to
have fixed it. Connectivity is probed at boot rather than discovered on the first mission.

**Event cap keeps the ends, not the middle.** The beginning explains what the mission set out to
do and the end explains how it finished; the middle of a runaway mission is the least informative
part. The dropped count is reported — a store that quietly stops recording lies about what happened.

### Verified
`76 tests green` (was 65; +11). Typecheck and lint clean. The server boots with **no cloud
configuration at all** and serves `/health` — checked by actually starting it, not by reasoning.

### NOT verified
`FirestoreStore` has never talked to Firestore. It is off by default (`MISSION_STORE=firestore`),
and enabling it in production also needs `roles/datastore.user` added to the runtime service
account — a deliberate privilege increase, recorded here rather than made quietly. Both blocked on
UA-004.

### Next phase
Phase 06 — audit the executor abstraction, the boundary the eligibility argument rests on.

---

## PHASE 06 / 07 / 08 — The Executor Seam

**Status:** VERIFIED_COMPLETE
**Specifications:** `PHASE_06_EXECUTOR_ABSTRACTION.md`, `PHASE_08_LASPOH_ADAPTER.md`

### Phase 06 — gaps found and closed

| # | Gap | Closure |
|---|---|---|
| E1 | No `wait` verb — asynchronous pages handled by repeated `inspect` | `wait` added, and it must state its condition |
| E2 | No cancellation — a mission could not be stopped mid-action | `ExecuteContext.signal`, checked before dispatch |
| E3 | The CONTRACT permitted a hang — only the implementation had timeouts | `execute` now documents two guarantees callers may rely on: it resolves, and it is bounded |
| E4 | Could an executor plan or judge? | **Not a gap.** `execute(action) -> Observation` is structurally incapable of either |

A wait must say what it is waiting **for**. A bare "wait five seconds" is a sleep dressed as an
observation: it makes every mission slower without making any more reliable, and it hides that
nobody knows what the page is supposed to do next. Expressed as a verb rather than left to
repeated `inspect`, because a wait implemented as repeated inspection is a loop the recovery layer
then has to be taught is not a loop.

A wait timeout returns `ok:false`, never throws. "The thing I was waiting for did not appear" is a
fact about the page and belongs in the same channel as every other fact about the page.

Adding `wait` to the union made **TypeScript fail two exhaustive switches** — exactly what a
discriminated union is for, and the reason the verb set is modelled this way.

### Phase 07 — reference executor
Already built in-period; `wait` and cancellation added here. It remains the default and the demo
path. No pre-existing code involved.

### Phase 08 — the adapter, and the risk Phase 00 recorded

Phase 00 wrote down the weakness rather than glossing it: *"the two-executor claim is proven by
INTERFACE, not by both running."* This phase closes it as far as is honest.

**Demonstrated:** the adapter satisfies the contract over real HTTP — unreachable bridge, HTTP
error, a body that never arrives, malformed replies — and returns Observations the agent consumes
identically to the reference executor's.

**Not demonstrated, and stated as such:** that the pre-existing Laspoh runtime works through it.
The bridge is a stub speaking the protocol, because the real one is not running.

**A real defect this found:** the adapter used `Boolean(raw.ok)`. `Boolean("yes")` is true — so is
`Boolean("failed")`. A malformed or hostile bridge could have reported success by sending any
non-empty string. Now `raw.ok === true`, strictly, with a test enumerating the shapes that coerce.

### Tests
`91 passed` (was 76; +15). Typecheck and lint clean.

### Next phase
Phase 09 — evidence, audited as first-class architecture rather than debugging metadata.

---

## PHASE 09 / 10 — Evidence and the Independent Verifier

**Status:** VERIFIED_COMPLETE
**Specification:** `mission/PHASE_10_INDEPENDENT_VERIFIER.md`

### Phase 09 — evidence carries its own provenance
Evidence now records **which executor produced it and whether that executor is pre-existing work**.
Provenance on the evidence itself, not only in the receipt's summary: a receipt can be regenerated,
and evidence gathered through a disclosed pre-existing runtime must carry that fact wherever it
travels.

### Phase 10 — the gap that mattered
`enforceCitation` checked that a citation EXISTED. It never checked that the cited text appeared
anywhere in the evidence — so a model could invent *"Confirmation reference: GR-000000"* and the
verdict stood on it.

Every other protection assumes the verifier is looking at real evidence: the isolation, the
disbelief default, the pre-committed criterion. **A fabricated citation defeats all of them at
once.** It is precisely what "can evidence be forged?" means, and until this phase the answer was
yes.

`groundCitations` now asks whether the characters are there. Mechanically — it does not ask a model
whether the quote is fair, because asking a model to police a model moves the problem up a level
rather than solving it. Normalised for case and wrapping, because a model that quotes accurately
and re-wraps a line has fabricated nothing; verbatim beyond that.

**A fabricated quote poisons the whole verdict**, rather than being dropped while the rest stands.
A verifier that invented one quote will assert what the evidence does not contain, and the
remaining citations came from the same answer.

### Tests
`106 passed` (was 91; +15 adversarial). No model involved in any of them, deliberately.

### Residual risk, recorded rather than glossed
A verifier that quotes **real** evidence but reasons badly about it — citing a genuine sentence
that does not actually establish the criterion — is not caught by grounding. Grounding proves the
quote is real, not that it is sufficient. That judgement stays with the model; the mitigations are
isolation, the pre-committed criterion (Phase 04 stops it being self-certifying), and disbelief by
default. This is the honest limit of the design.

### Next phase
Phase 11 — receipts, so all of this reaches the reader.

---

## PHASE 11 / 12 — Receipts and Recovery

**Status:** VERIFIED_COMPLETE

### Phase 11 — what the receipt can now say against itself
The failure mode for a report like this is rarely a lie. It is an **omission** — a number that is
technically correct beside a category the reader was never shown. So the receipt gained the
categories, not more adjectives:

- `failed` and `unattempted` counted **separately**. "We tried and it did not work" and "we never
  got to it" are different facts and a reader deserves both.
- Each failed line carries its **class and retryability**, so "this could not have worked" is
  distinguishable from "this did not work this time".
- **Dropped steps** — what the sanitiser removed before execution, and why. The commonest removal
  is a proof criterion that restated the action, which tells a reader something real about the plan
  they were given.
- `usedPreExistingExecutor` — set if ANY evidence came through the disclosed pre-existing runtime.
  Structural disclosure travelling with the result, not living in a README.
- `startedAt` / `durationMs`.

**A mistake I made and fixed here:** rewriting the headline produced *"Proven 0 of 1. 0 step(s)
were never attempted"* — clumsier than what it replaced, and it broke an existing assertion. The
existing test was right and my change was wrong. Rewritten so every branch states the proven number
**and** what stands against it, since a number alone is where an honest report quietly becomes a
flattering one.

### Phase 12 — retrying only what could work
`worthRetrying` uses the typed `retryable` from Phase 03 instead of inferring intent from prose. A
control that does not exist will not come into existence because we asked twice; a transport blip
genuinely might clear. Bounded, because unbounded retry is a loop by another name.

Loop defence itself (`isBlindRepeat`, `isWandering`, `decide`) was already in place and unchanged —
progress is measured in **proven work alone**, so page churn cannot reset the stall counter.

### Tests
`120 passed` (was 106; +14). Typecheck and lint clean.

### Next phase
Phase 13 — security and trust boundaries. Prompt injection from page content is the largest
untouched risk in the system: the agent reads attacker-controlled text on every single step.

---

## PHASE 13 — Security & Trust Boundaries

**Status:** VERIFIED_COMPLETE
**Specification:** `mission/PHASE_13_SECURITY.md`

### The insight that shaped this phase
Against most agents, prompt injection aims at exfiltration. Against **this** system the
highest-value attack is cheaper and narrower: **persuade the verifier the work is done.** Nothing
needs to be stolen. A page that can make the verifier say "proven" defeats the isolation, the
disbelief default and the pre-committed criterion at once — so the verifier's prompt is where
fencing was applied first.

### Controls
- **Fencing**, structural and always on, with a **per-call nonce** — a fixed marker like
  `---PAGE---` is one a page can simply print, and the fence would end where the attacker chose.
- **Detection**, advisory and never editing. A page addressing the agent is carried into the
  verifier's context as evidence of *untrustworthiness*. Silently stripping it would corrupt the
  evidence and destroy the only signal that anyone tried.
- **Navigation boundary**, refused in code, defaulting to the origin of `startUrl` so the safe case
  needs nobody to remember it. Refusals are recorded as `blocked` + `policy_refused` — the step was
  never attempted, and "failed" would claim otherwise.

### What it does NOT defend against, stated plainly
A hostile page printing convincing fake confirmation text. The verifier will ground that citation
because the quote is genuinely on the page — grounding proves a quote is real, not that the page is
honest. The answer is architectural, not a better prompt: the independent ground-truth check the
demo already uses (`/demo/submissions`, which the agent cannot write to). Where no such source
exists, the receipt reflects what the page showed. That is a property of browser automation, not of
this design.

### Tests
`136 passed` (+16). The **false-positive** tests matter as much as the attacks: a detector that
fires on "please follow the instructions below" would mark ordinary application forms untrustworthy
and make the signal worthless.

### Next phase
Phase 14 — observability, so a judge watching logs during the demo sees the architecture working.
