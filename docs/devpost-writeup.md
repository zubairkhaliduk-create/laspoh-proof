# Devpost submission — draft

**Project name:** Laspoh Proof
**Category:** The Taskmaster
**Tagline:** An autonomous agent that proves what it did — or admits it couldn't.

---

## Inspiration

I run a browser agent in production. The failure that cost me most wasn't crashes — it was
**confident lies**. A mission would report "Applied to 10 jobs. Task complete." having submitted
zero. Every click had fired, no errors appeared, and the summary was green. The agent wasn't
malfunctioning; it was reporting its *intentions* and calling them results.

Once you've seen that, you stop trusting any agent that can't show its work. So I built one whose
central rule is that **the component doing the work never grades it.**

## What it does

You give it an outcome. It plans, drives a browser, and gathers evidence. Then a **separate
verifier** — which never sees the planner's reasoning or the executor's opinion — decides from the
page's own output whether each step actually happened, and must cite the evidence to say yes.

The result is a receipt: `Proven 3 of 5`, naming the two it couldn't prove and why. A step counts
only when independently confirmed — not when the click fires, not when the planner is confident,
not when no error appears.

## How I built it

**Gemini 3.6 Flash** via **Genkit**, on **Cloud Run**.

The design decision everything follows from is a seam between *the agent* and *actuation*. Above
it: planning, state, evidence, verification, recovery. Below it: driving a page. Two executors ship
behind one interface, so the separation is demonstrable rather than claimed — swap the executor and
the agent is unchanged.

Recovery is pure code, deliberately out of the model's hands. An LLM asked "are you stuck?" says no
and tries again — which is how agents burn money in circles. So the decisions to stop, escalate or
ask a human are unit-testable predicates that can't be talked out of their verdict.

## Findings and learnings

**"Proven" needs enforcing in code, not prompting.** The verifier is told every "proven" verdict
must cite evidence. It doesn't always comply — so a proven verdict that cites nothing is downgraded
in code. Guarantees that depend on a model choosing to honour them aren't guarantees.

**Page change is not progress.** My first stall detector counted steps where the page didn't
change. An agent navigating between genuinely different pages resets that counter forever and looks
busy indefinitely while proving nothing. Progress has to be measured in *proven work* alone.

**A stall detector can manufacture the failure it's meant to catch.** An earlier version fired
while a form was being filled — filling banks nothing until submission — and told the agent to
"take the action that produces a result", which it read as *submit*. It caused premature submits on
incomplete forms. The fix: a landed fill counts as progress, and when the page itself names an
unanswered required field, the mission isn't stuck — it has a stated next move.

**Native dropdowns must be set, never clicked.** Clicking one opens a browser-drawn list that isn't
in the DOM and swallows input. My own test caught me making this mistake.

## Disclosure

**Laspoh** is a pre-existing browser-automation platform of mine (repository dates from June 2026)
and is **not** presented as hackathon work. Everything in this repository was built during the
submission period. Its only point of contact is a ~100-line adapter exposing it through the same
`Executor` interface. The default executor is new, the demo runs on it, and every receipt records
which executor produced a result and whether it is pre-existing.

## What's next

Making the verifier cheap enough to run on every step of long missions, and letting it request
*specific* additional evidence when a criterion is unproven rather than simply reporting it so.
