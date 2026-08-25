# Devpost submission

**Project name:** Laspoh Proof
**Tagline:** An autonomous agent that proves what it did — or says plainly that it could not.
**Category:** The Taskmaster

**Repository:** https://github.com/zubairkhaliduk-create/laspoh-proof
**Live project:** https://laspoh-proof-wqx6gkuc7a-uc.a.run.app
**Demo video:** _[to add]_

---

## Inspiration

I run a browser agent in production. The failure that cost me most wasn't crashes — it was
**confident lies**. A mission would report "Applied to 10 jobs. Task complete." having submitted
zero. Every click had fired, no errors appeared, the summary was green. The agent wasn't
malfunctioning; it was reporting its *intentions* and calling them results.

Once you have seen that, you stop trusting any agent that cannot show its work. So I built one
whose central rule is that **the component doing the work never grades it.**

## What it does

You give it an outcome. It plans, drives a browser, and gathers evidence. Then a **separate
verifier** — which never sees the planner's reasoning or the executor's opinion — decides from the
page's own output whether each step actually happened, and must **quote the evidence** to say yes.

The result is a receipt: `Proven 7 of 8`, naming the one it could not prove and why. A step counts
only when independently confirmed — not when the click fires, not when the planner is confident,
not when no error appears.

The system is permitted, by design, to report **less** than it achieved. It is never permitted to
report more.

## How I built it

**Gemini 3.5 Flash** via **Genkit**, on **Cloud Run**, with mission state in **Firestore**.

Three Genkit flows carry every model decision: `plan`, `repair`, `verify`. Remove Genkit and the
agent has no reasoning left.

The design decision everything follows from is a seam between *the agent* and *actuation*. Above
it: planning, state, evidence, verification, recovery. Below it: driving a page. Two executors ship
behind one interface, so the separation is demonstrable rather than claimed — swap the executor and
the agent is unchanged.

Recovery is pure code, deliberately out of the model's hands. An LLM asked "are you stuck?" says no
and tries again. So the decisions to stop, escalate or retry are unit-testable predicates that
cannot be talked out of their verdict.

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

## Technologies

TypeScript · Genkit 1.41 (`@genkit-ai/google-genai`) · Gemini 3.5 Flash via Vertex AI · Cloud Run ·
Firestore · Playwright · Zod · Vitest · oxlint · GitHub Actions

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

`pnpm test` runs 142 tests, none of which need a model.

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
