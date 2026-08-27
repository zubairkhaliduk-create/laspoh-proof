# Devpost submission

**Project name:** Laspoh Proof
**Tagline:** An autonomous agent that proves what it did — or says plainly that it could not.
**Category:** The Taskmaster

**Repository:** https://github.com/zubairkhaliduk-create/laspoh-proof
**Live project:** https://laspoh-proof-wqx6gkuc7a-uc.a.run.app
**Demo video:** _[to add]_

---

## Inspiration — the friction I brought

The brief said Bring Your Own Friction. Mine is documented, dated, and could not be recalled.

I run a browser agent in production — Laspoh, disclosed below as pre-existing work. One of my own
missions was to apply for jobs, with one exclusion written explicitly into the goal: no recruitment
agencies. The agent reported success. Five of the ten applications had gone to recruitment
agencies — the exact category the goal ruled out. Every click had fired, no errors appeared, the
summary was green. The agent had graded its own work and passed itself; an independent verifier,
checking afterwards, was the only thing that caught it — and by then the applications were sent.
Sent is sent.

It was not a one-off. Another mission reported "Applied to 10 jobs. Task complete." having
submitted zero. Opposite direction, same disease: the agent wasn't malfunctioning, it was reporting
its *intentions* and calling them results — and because the component doing the work was also the
component grading it, nothing inside the system could disagree.

Laspoh Proof is the BYOF mandate taken literally. The personal problem: I could not trust my own
agent's word, on work that could not be taken back. The fix is an agent whose central rule is that
**the component doing the work never grades it.**

## What it does

You give it an outcome in one sentence, and you leave. The request returns immediately; the
mission runs as a **multi-step background workflow** — plan, drive a browser, observe, gather
evidence, recover — and completes **without human intervention**. This is autonomous execution, not
a chat query: a workflow you would otherwise click through by hand is intercepted at the moment of
intent and carried through to a real state change in the world. Then a **separate
verifier** — which never sees the planner's reasoning or the executor's opinion — decides from the
page's own output whether each step actually happened, and must **quote the evidence** to say yes.

The result is a receipt: `Proven 7 of 8`, naming the one it could not prove and why. A step counts
only when independently confirmed — not when the click fires, not when the planner is confident,
not when no error appears.

The system is permitted, by design, to report **less** than it achieved. It is never permitted to
report more.

The twist is that the doer is never the judge — and the judge does not judge alone either: after
the Gemini verifier confirms a step and every quote it cites is mechanically checked to appear
verbatim in the evidence, a second, independent Google model family (**Gemma**) audits those quotes
and can only demote the verdict, never promote it. The real-world friction this eliminates is
double: the browser workflow itself, and the second job every agent user currently has — re-doing
the work to find out whether it actually happened. A receipt that must quote its evidence removes
the checking, not just the clicking.

## How I built it

**Gemini 3.5 Flash** via **Genkit**, on **Cloud Run**, with mission state in **Firestore** — and
two more Google AI models wired so each can only make the system more skeptical: **Gemma 4**
re-audits every grounded "proven" verdict from a different model family (demote-only), and
**gemini-embedding-001** classifies each rejected citation as a paraphrase of real evidence or an
outright invention (explanation-only). The full architecture, with the isolation boundary drawn,
is in the repo: `docs/architecture.png`.

Three Genkit flows carry every model decision: `plan`, `repair`, `verify`. Remove Genkit and the
agent has no reasoning left.

The design decision everything follows from is a seam between *the agent* and *actuation*. Above
it: planning, state, evidence, verification, recovery. Below it: driving a page. Two executors ship
behind one interface, so the separation is demonstrable rather than claimed — swap the executor and
the agent is unchanged.

Recovery is pure code, deliberately out of the model's hands. An LLM asked "are you stuck?" says no
and tries again. So the decisions to stop, escalate or retry are unit-testable predicates that
cannot be talked out of their verdict — which is what makes running without human intervention safe
rather than merely unattended.

## Findings and learnings

**A citation nobody checks is not a citation.** The verifier was required to quote the evidence for
any "proven" verdict — and for a long time nothing checked the quote was actually *in* the
evidence. A model could invent "Confirmation reference: GR-000000" and the verdict stood on it.
That single gap defeats the isolation, the disbelief default and the pre-committed criterion
simultaneously. It is now checked mechanically, because asking a model whether a model's quote is
fair only moves the problem up one level.

**Self-certification can launder itself through an independent component.** Each step's proof
criterion is written before the step runs, precisely so success cannot be redefined afterwards. But
a criterion like *"the button was clicked"* hands that redefinition straight back: the verifier is
asked to confirm the **action** rather than the outcome, and answers correctly about the wrong
question. Every part behaves as designed and the central claim dies anyway.

**The worst bug does not look like a bug.** A DOM read threw inside the page, the throw was caught,
and the form reported itself as having no fields — indistinguishable from an empty form. Nothing
errored, nothing logged, and the agent went blind while every symptom pointed elsewhere.

**Evidence has to be able to contain the answer.** Fills kept returning "unproven" and the verifier
looked harsh. It wasn't: an input's value never appears in a page's visible text, so it was judging
a criterion against material that structurally could not confirm it. Being strict about evidence is
worthless if you're strict about the wrong evidence.

**Don't ask a model to be careful — take the decision away from it.** The fix for submitting with
required fields empty is not a better prompt. The page reports what is required; a pure function
subtracts what the plan already covers; whatever is left gets filled first.

## Measured reliability

Numbers a judge can re-run, not a chart I graded myself
([`mission/DEMO_EVIDENCE.md`](https://github.com/zubairkhaliduk-create/laspoh-proof/blob/main/mission/DEMO_EVIDENCE.md)
has the raw runs and the harness):

| Metric (consecutive production missions) | Before the navigate-first fix | After |
|---|---|---|
| Honest — no fabricated reference | 9/9 | **8/8** |
| Proved a confirmation reference | 7/9 (78%) | **8/8 (100%)** |
| `blocked` — proved nothing | 2/8 | **0/8** |

One disclosure that belongs next to any reliability table: my first harness printed `proved: 8/8`
when the truth was 6/8 — a field-parsing bug. It was caught, fixed, and recorded in the repo rather
than published, because a reliability report that overstates its own success rate would be this
project failing in exactly the way it exists to prevent.

## Technologies

TypeScript · Genkit 1.41 (`@genkit-ai/google-genai`) · **Gemini 3.5 Flash** via Vertex AI ·
**Gemma 4** (`gemma-4-31b-it`, second-opinion auditor — a different model family that must concur
before "proven" stands, and can only demote) · **gemini-embedding-001** (fabrication forensics —
classifies a rejected citation as a paraphrase of real evidence or an outright invention; changes
the explanation, never the verdict) · Cloud Run · Firestore · Playwright · Zod · Vitest · oxlint ·
GitHub Actions

**Data sources:** none external. Beyond the user's goal, the agent's only input is the pages it
visits, captured as fenced, sha256-hashed evidence. The demo's ground truth, `/demo/submissions`,
is served by the same process and is deliberately unwritable by the agent.

## Testing instructions for judges

No credentials and no cloud setup are needed to run a mission — the default store is in-memory and
the demo target is served by the same process.

    pnpm install && pnpm exec playwright-core install chromium
    export GEMINI_API_KEY="…"        # or use Vertex ADC
    pnpm dev

    curl -X POST http://localhost:8080/missions -H 'content-type: application/json' \
      -d '{"goal":"Apply for the research grant as Ada Lovelace (ada@example.com), an independent researcher. Obtain the confirmation reference.","startUrl":"http://localhost:8080/demo"}'

Then compare `/missions/:id/receipt` against `/demo/submissions` — ground truth the agent cannot
write to. A receipt citing a reference the server never issued would be provably wrong.

`pnpm test` runs 160 tests, none of which need a model.

## Disclosure of pre-existing work

**Laspoh** is a pre-existing experimental browser-automation platform of mine. Its repository begins
**24 June 2026**, forty days before this hackathon's submission period, and 462 of its 542 commits
predate 3 August 2026. **It is not this submission and is not presented as hackathon work.**

**Laspoh Proof** is a new Gemini + Genkit autonomous verification agent built during the **3–31
August 2026** submission period. First commit 20 August 2026; zero commits before 3 August. The
submitted agent's planning, orchestration, mission state, reference executor, evidence pipeline,
independent verification, recovery, security boundaries and receipt architecture were all developed
during the submission period.

The only point of contact is a 73-line HTTP adapter (`src/executors/laspoh.ts`), written during the
period, which carries `preExisting = true` into every receipt produced through it. **It is disabled
by default.** The demo, the deployed service and the entire test suite run on the new reference
executor.

Verifiable directly:

    git log --reverse --format='%h %ad' --date=iso | head -1   # 2026-08-20
    git rev-list --count --before=2026-08-03 HEAD              # 0
    grep -rn "andiwal/laspoh\|@laspoh/" src test               # no matches

## What's next

Making the verifier cheap enough to run on every step of long missions, and letting it request
*specific* additional evidence when a criterion is unproven rather than simply reporting it so.
